const http = require('http');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');

const PORT = process.env.PORT || 8080;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || 'sk_84ebebc8813d25d47e2a643ca556b6739ef7badfe396fb52';

// Voice mapping - maps our voice IDs to ElevenLabs voice IDs
const VOICES = {
  'eric': { id: 'cjVigY5qzO86Huf0OWal', name: 'Eric', desc: 'Smooth & Trustworthy' },
  'sarah': { id: 'EXAVITQ4vVDHCKv3BZtt', name: 'Sarah', desc: 'Professional Executive' },
  'marcus': { id: 'ErXwobaYiN019ONkyW1e', name: 'Marcus', desc: 'Deep Authority' },
  'oldcowboy': { id: 'VR6AewLTigWG4xSOukaG', name: 'Old Cowboy', desc: 'Wild West Tales' },
  'trailguide': { id: 'pFZP5JQG7iQjIQuX4u60', name: 'Trail Guide', desc: 'Frontier Spirit' },
  'grandma': { id: 'oWAxZDx7w5FHjMwjkFCO', name: 'Grandma', desc: 'Warm Stories' },
  'storyteller': { id: 'ZXCh6zQMdCFgMC7kWV9z', name: 'Storyteller', desc: 'Narrative Voice' },
  'genz': { id: 'JGFNMYy濮FiWv9ZBarq', name: 'Gen Z', desc: 'Young & Hype' },
  'trendsetter': { id: 'TSJHLlqOl1BtHMWKkIBk', name: 'Trendsetter', desc: 'Cool Vibes' },
  'southern': { id: '5Z3EWraVMiV8wzsfuTDo', name: 'Southern Charm', desc: 'Southern USA' },
  'british': { id: 'SAZ9YlAv7ehk5AwG9rDL', name: 'British RP', desc: 'British Accent' },
  'hero': { id: 'TxGEqnHWrfWFTfGW9UPj', name: 'Hero', desc: 'Animation Hero' },
  'villain': { id: 'ZA4mP7eCOo55ldLYoG1C', name: 'Villain', desc: 'Dark Character' },
  'everydayjoe': { id: 'wViXPUHCLPcH3NAnJ9Or', name: 'Everyday Joe', desc: 'Neutral Voice' },
  'friendly': { id: 'LfaY2DwTOlVuN7KArIpG', name: 'Friendly', desc: 'Helpful Voice' },
};

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
};

console.log(`Starting server on port ${PORT}...`);

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // API endpoint for generating audio
  if (req.method === 'POST' && req.url === '/api/generate') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const { voiceKey, text, speed, pitch, timber, format } = data;
        
        const voice = VOICES[voiceKey] || VOICES['eric'];
        
        console.log(`Generating audio for voice: ${voice.name}, text length: ${text.length}`);
        
        // Call ElevenLabs API
        const audioData = await generateElevenLabsAudio(
          voice.id,
          text,
          speed || 1,
          pitch || 0,
          timber || 50,
          format || 'mp3'
        );
        
        const contentType = format === 'wav' ? 'audio/wav' : 'audio/mpeg';
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(audioData);
        
      } catch (error) {
        console.error('Generation error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }
  
  // Voices list endpoint
  if (req.method === 'GET' && req.url === '/api/voices') {
    const voicesList = Object.entries(VOICES).map(([key, v]) => ({
      key,
      id: v.id,
      name: v.name,
      desc: v.desc
    }));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(voicesList));
    return;
  }
  
  // Serve static files
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
  
  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end('File not found');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

async function generateElevenLabsAudio(voiceId, text, speed, pitch, timber, format) {
  const stability = timber / 100; // 0-1
  const similarityBoost = timber / 100; // 0-1
  
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'Accept': format === 'wav' ? 'audio/wav' : 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': ELEVENLABS_API_KEY
    },
    body: JSON.stringify({
      text: text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: stability,
        similarity_boost: similarityBoost,
        style: 0.5,
        use_speaker_boost: true
      }
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
  }
  
  return await response.arrayBuffer();
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${PORT}/`);
  console.log(`API endpoint: POST /api/generate`);
});
