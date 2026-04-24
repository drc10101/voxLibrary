const fs = require('fs');
let d = fs.readFileSync('C:/Users/drc10/.openclaw/workspace/voice-library-prototype/index.html', 'utf8');

const idx = d.indexOf('async function loadUserProfile');
const endIdx = d.indexOf('sb.auth.getSession().then', idx);

const oldFunc = d.substring(idx, endIdx);

const newFunc = `async function loadUserProfile(user) {
  if (!user) return;
  const { data: profile } = await sb.from('profiles').select('*').eq('id', user.id).single();
  if (profile) {
    userState.plan = profile.plan || 'trial';
    userState.charsUsed = profile.chars_used || 0;
    userState.isTrial = profile.plan === 'trial';
    userState.trialEnd = profile.trial_end;
  } else {
    userState.plan = 'trial';
    userState.charsUsed = 0;
    userState.isTrial = true;
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 5);
    userState.trialEnd = trialEnd.toISOString();
  }
  updateStats();
}

`;

d = d.substring(0, idx) + newFunc + d.substring(endIdx);
fs.writeFileSync('C:/Users/drc10/.openclaw/workspace/voice-library-prototype/index.html', d);
console.log('Fixed loadUserProfile!');
