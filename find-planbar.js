const fs = require('fs');
const d = fs.readFileSync('index.html', 'utf8');
const idx = d.indexOf('id="plan-bar"');
console.log(d.substring(idx, idx + 1500));
