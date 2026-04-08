const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const Stripe = require('stripe');

const PORT = process.env.PORT || 8080;
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kxnqwpavjhiphgvkevvj.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
const RUNPOD_FISH_SPEECH = process.env.RUNPOD_FISH_SPEECH;
const RUNPOD_FISH_ENDPOINT_ID = process.env.RUNPOD_FISH_ENDPOINT_ID || '53xyuo8cif3b4k';
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

console.log('=== SERVER STARTUP CHECK ===');
console.log('PORT:', PORT);
console.log('SUPABASE_URL:', SUPABASE_URL ? 'SET' : 'MISSING');
console.log('SUPABASE_SERVICE_KEY:', SUPABASE_SERVICE_KEY ? 'SET' : 'MISSING');
console.log('RUNPOD_API_KEY:', RUNPOD_API_KEY ? 'SET' : 'MISSING');
console.log('RUNPOD_FISH_SPEECH:', RUNPOD_FISH_SPEECH ? 'SET' : 'MISSING');
console.log('RUNPOD_FISH_ENDPOINT_ID:', RUNPOD_FISH_ENDPOINT_ID);
console.log('STRIPE_SECRET_KEY:', STRIPE_SECRET_KEY ? 'SET' : 'MISSING');
console.log('stripe:', STRIPE_SECRET_KEY ? 'will init' : 'null (will skip)');
console.log('https:', typeof https);
console.log('https.request:', typeof https.request);
console.log('===========================');

const server = http.createServer((req, res) => {
  if (req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', time: new Date().toISOString() }));
  } else {
    res.writeHead(404);
    res.end('not found');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Test server running on port ${PORT}`);
});

setTimeout(() => {
  console.log('Test complete, shutting down');
  process.exit(0);
}, 2000);
