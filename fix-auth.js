const fs = require('fs');
let d = fs.readFileSync('index.html', 'utf8');

const oldFn = `function updateAuthUI(user) {
  const headerAuth = document.getElementById('header-auth');
  if (user) {
    headerAuth.innerHTML = '<span style="color:#aaa;font-size:13px;">' + user.email + '</span> <button class="logout-btn" onclick="logout()">Logout</button>';
  } else {
    headerAuth.innerHTML = '<button class="auth-btn" onclick="openAuthModal()">Sign In</button>';
  }
}`;

const newFn = `function updateAuthUI(user) {
  const headerAuth = document.getElementById('header-auth');
  const planBar = document.getElementById('plan-bar');
  if (user) {
    headerAuth.innerHTML = '<span style="color:#aaa;font-size:13px;">' + user.email + '</span> <button class="logout-btn" onclick="logout()">Logout</button>';
    if (planBar) planBar.style.display = 'flex';
  } else {
    headerAuth.innerHTML = '<button class="auth-btn" onclick="openAuthModal()">Sign In</button>';
    if (planBar) planBar.style.display = 'none';
  }
}`;

d = d.replace(oldFn, newFn);
fs.writeFileSync('index.html', d);
console.log('Done');
