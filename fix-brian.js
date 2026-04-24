const fs = require('fs');
let d = fs.readFileSync('index.html', 'utf8');
d = d.replace('icon: "深沉"', 'icon: "👋"');
fs.writeFileSync('index.html', d);
console.log('Fixed');
