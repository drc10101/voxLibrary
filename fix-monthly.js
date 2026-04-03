const fs = require('fs');
let d = fs.readFileSync('index.html', 'utf8');

// Update PRICE_IDS to monthly
const oldPrices = `const PRICE_IDS = {
  starter: 'price_1TIFXkGfRLc2oae0ILw2xSUJ',
  creator: 'price_1TIFXlGfRLc2oae0CqG1tpI6',
  studio: 'price_1TIFXlGfRLc2oae0Y6lAbdCU',
  pro: 'price_1TIFXlGfRLc2oae0FWlOhBZ5'
};`;

const newPrices = `const PRICE_IDS = {
  starter: 'price_1TIFzdGfRLc2oae03sNISgJj',
  creator: 'price_1TIFzdGfRLc2oae0RZzGhlfp',
  studio: 'price_1TIFzeGfRLc2oae09tipjH6i',
  pro: 'price_1TIFzeGfRLc2oae0dvHAyq9d'
};`;

d = d.replace(oldPrices, newPrices);

// Fix the price buttons to show MONTHLY prices
d = d.replace('$99.99/yr', '$9.99/mo');
d = d.replace('$249.99/yr', '$24.99/mo');
d = d.replace('$599.99/yr', '$59.99/mo');
d = d.replace('$1,299.99/yr', '$129.99/mo');

fs.writeFileSync('index.html', d);
console.log('Fixed to monthly prices');
