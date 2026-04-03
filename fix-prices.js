const fs = require('fs');
let d = fs.readFileSync('index.html', 'utf8');

// Fix the price buttons to show correct prices
d = d.replace('>$99/yr<', '>$99.99/yr<');
d = d.replace('>$249/yr<', '>$249.99/yr<');
d = d.replace('>$599/yr<', '>$599.99/yr<');
d = d.replace('>$1299/yr<', '>$1,299.99/yr<');

fs.writeFileSync('index.html', d);
console.log('Fixed');
