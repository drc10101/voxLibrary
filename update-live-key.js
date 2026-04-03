const fs = require('fs');
let d = fs.readFileSync('index.html', 'utf8');

// Replace the test key with live key
d = d.replace(
  'pk_test_51TIFTVGfRLc2oae0U19SK1BkaAtq1FGU42FWeax0gynHt6lUq2rOqeMP1Gt7NpcXNEJO6cCI1pRzfUccoAs9k64S00Qz6cetyE',
  'pk_live_51TIFTVGfRLc2oae0RttNJM7XWRDAOt88QcolZ7YWmDuXwLJOiL3se1xr2y3Z81icjZbu0w7bUs7wgS7LDNsQ5ntM00FvJlAjaZ'
);

// Also update the secret key reference (for server-side later)
console.log('Updated publishable key to live');
fs.writeFileSync('index.html', d);
