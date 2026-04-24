const fs = require('fs');
let d = fs.readFileSync('index.html', 'utf8');

// Add plan bar with upgrade buttons after header
const planBar = `<!-- Plan bar -->
<div id="plan-bar" style="display:none; background:#1a1a2e; padding:10px 40px; border-bottom:1px solid #333; flex-wrap:wrap; gap:15px; align-items:center;">
  <div style="display:flex; gap:10px; align-items:center;">
    <select id="plan-select" onchange="changePlan(this.value)" style="background:#2d2d44; color:white; border:1px solid #444; padding:8px 12px; border-radius:6px; cursor:pointer;">
      <option value="starter">Starter — 8K</option>
      <option value="creator">Creator — 25K</option>
      <option value="studio">Studio — 80K</option>
      <option value="pro">Pro — 200K</option>
    </select>
    <button onclick="upgradePlan('starter')" style="background:#333; border:none; color:#aaa; padding:6px 12px; border-radius:6px; font-size:12px; cursor:pointer;">$99/yr</button>
    <button onclick="upgradePlan('creator')" style="background:#333; border:none; color:#aaa; padding:6px 12px; border-radius:6px; font-size:12px; cursor:pointer;">$249/yr</button>
    <button onclick="upgradePlan('studio')" style="background:#333; border:none; color:#aaa; padding:6px 12px; border-radius:6px; font-size:12px; cursor:pointer;">$599/yr</button>
    <button onclick="upgradePlan('pro')" style="background:#667eea; border:none; color:#fff; padding:6px 12px; border-radius:6px; font-size:12px; cursor:pointer; font-weight:bold;">$1299/yr</button>
  </div>
  <div style="flex:1;"></div>
  <div style="display:flex; gap:20px; align-items:center;">
    <div class="stat">
      <div class="stat-value"><span id="chars-remaining">8,000</span> <span style="font-size:12px; color:#888;">/ <span id="chars-total">8,000</span></span></div>
      <div class="stat-label">Characters <span id="plan-name" style="color:#888; font-size:10px;">(Starter)</span></div>
      <div class="chars-bar"><div class="chars-fill" id="chars-fill"></div></div>
    </div>
    <div class="stat">
      <div class="stat-value days-left" id="days-left">347</div>
      <div class="stat-label">Days Left</div>
    </div>
  </div>
</div>
`;

d = d.replace('</header>\n\n<!-- Auth Modal -->', '</header>\n\n' + planBar + '\n<!-- Auth Modal -->');
fs.writeFileSync('index.html', d);
console.log('Plan bar added');
