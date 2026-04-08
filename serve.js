const http = require('http');
const https = require('https');

const PORT = process.env.PORT || 8080;
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kxnqwpavjhiphgvkevvj.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const RUNPOD_FISH_SPEECH = process.env.RUNPOD_FISH_SPEECH;
const RUNPOD_FISH_ENDPOINT_ID = process.env.RUNPOD_FISH_ENDPOINT_ID || '53xyuo8cif3b4k';

console.log('PORT:', PORT);
console.log('SUPABASE_SERVICE_KEY:', SUPABASE_SERVICE_KEY ? 'SET ✓' : 'MISSING ✗');
console.log('RUNPOD_FISH_SPEECH:', RUNPOD_FISH_SPEECH ? 'SET ✓' : 'MISSING ✗');
console.log('RUNPOD_FISH_ENDPOINT_ID:', RUNPOD_FISH_ENDPOINT_ID);
console.log('https module:', typeof https);
console.log('https.request:', typeof https.request);

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);
  
  // Health check
  if (req.method === 'GET' && req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', time: new Date().toISOString() }));
    return;
  }
  
  // Community voices
  if (req.method === 'GET' && req.url === '/api/community-voices') {
    if (!SUPABASE_SERVICE_KEY) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'SUPABASE_SERVICE_KEY not set' }));
      return;
    }
    
    const voicesUrl = `${SUPABASE_URL}/rest/v1/community_voices?select=voice_id,name,accent,pitch,describe1,describe2,uses,created_at&order=created_at.desc`;
    const req = https.request(
      voicesUrl.replace('https://', ''),
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        },
        method: 'GET'
      },
      (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const voices = JSON.parse(data);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ voices }));
          } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Parse error' }));
          }
        });
      }
    );
    req.on('error', (e) => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    });
    req.end();
    return;
  }
  
  res.writeHead(404);
  res.end('not found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
