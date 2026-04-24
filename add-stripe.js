const fs = require('fs');
let d = fs.readFileSync('index.html', 'utf8');

// Replace the basic updateAuthUI with full one including upgrade
const oldAuth = `function updateAuthUI(user) {
  const headerAuth = document.getElementById('header-auth');
  if (user) {
    headerAuth.innerHTML = '<span style="color:#aaa;font-size:13px;">' + user.email + '</span> <button class="logout-btn" onclick="logout()">Logout</button>';
  } else {
    headerAuth.innerHTML = '<button class="auth-btn" onclick="openAuthModal()">Sign In</button>';
  }
}`;

const newAuth = `function updateAuthUI(user) {
  const headerAuth = document.getElementById('header-auth');
  const planBar = document.getElementById('plan-bar');
  if (user) {
    headerAuth.innerHTML = '<span style="color:#aaa;font-size:13px;">' + user.email + '</span> <button class="logout-btn" onclick="logout()">Logout</button>';
    if (planBar) planBar.style.display = 'flex';
  } else {
    headerAuth.innerHTML = '<button class="auth-btn" onclick="openAuthModal()">Sign In</button>';
    if (planBar) planBar.style.display = 'none';
  }
}

async function upgradePlan(plan) {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { openAuthModal(); return; }
  const { error } = await stripe.redirectToCheckout({
    lineItems: [{ price: PRICE_IDS[plan], quantity: 1 }],
    mode: 'subscription',
    successUrl: window.location.origin + '?upgrade=success',
    cancelUrl: window.location.origin + '?upgrade=cancelled'
  });
  if (error) alert('Checkout error: ' + error.message);
}`;

d = d.replace(oldAuth, newAuth);
fs.writeFileSync('index.html', d);
console.log('Done');
