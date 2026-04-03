const fs = require('fs');
let d = fs.readFileSync('index.html', 'utf8');

// Update PRICE_IDS to live mode
const oldPrices = `const PRICE_IDS = {
  starter: 'price_1TIFzdGfRLc2oae03sNISgJj',
  creator: 'price_1TIFzdGfRLc2oae0RZzGhlfp',
  studio: 'price_1TIFzeGfRLc2oae09tipjH6i',
  pro: 'price_1TIFzeGfRLc2oae0dvHAyq9d'
};`;

const newPrices = `const PRICE_IDS = {
  starter: 'price_1TIGvyGfRLc2oae0fw5dEEYU',
  creator: 'price_1TIGvzGfRLc2oae0ljAG06ij',
  studio: 'price_1TIGw0GfRLc2oae0hveGx70E',
  pro: 'price_1TIGw0GfRLc2oae0lsHC0bfO'
};`;

d = d.replace(oldPrices, newPrices);
fs.writeFileSync('index.html', d);
console.log('Updated to live price IDs');
