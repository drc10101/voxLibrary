const fs = require('fs');
const d = fs.readFileSync('index.html', 'utf8');
console.log('plan-name:', d.includes('id="plan-name"'));
console.log('chars-remaining:', d.includes('id="chars-remaining"'));
console.log('chars-total:', d.includes('id="chars-total"'));
console.log('chars-fill:', d.includes('id="chars-fill"'));
console.log('days-left:', d.includes('id="days-left"'));
console.log('plan-bar:', d.includes('id="plan-bar"'));
