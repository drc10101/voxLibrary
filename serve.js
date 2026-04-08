const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');
const Stripe = require('stripe');

const PORT = process.env.PORT || 8080;
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kxnqwpavjhiphgvkevvj.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
const RUNPOD_FISH_SPEECH = process.env.RUNPOD_FISH_SPEECH;
const RUNPOD_FISH_ENDPOINT_ID = process.env.RUNPOD_FISH_ENDPOINT_ID || '53xyuo8cif3b4k';
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const stripe = STRIPE_SECRET_KEY ? Stripe(STRIPE_SECRET_KEY) : null;

console.log('=== VOXLIBRARY SERVER ===');
console.log('PORT:', PORT);
console.log('SUPABASE_SERVICE_KEY:', SUPABASE_SERVICE_KEY ? 'SET' : 'MISSING');
console.log('RUNPOD_API_KEY:', RUNPOD_API_KEY ? 'SET' : 'MISSING');
console.log('RUNPOD_FISH_SPEECH:', RUNPOD_FISH_SPEECH ? 'SET' : 'MISSING');
console.log('RUNPOD_FISH_ENDPOINT_ID:', RUNPOD_FISH_ENDPOINT_ID);
console.log('STRIPE_SECRET_KEY:', STRIPE_SECRET_KEY ? 'SET' : 'MISSING');
console.log('stripe:', stripe ? 'initialized' : 'null (will skip Stripe features)');
console.log('=========================');

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.flac': 'audio/flac',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
};

function parseMultipart(body, boundary) {
  const parts = {};
  if (!body || !boundary) return parts;
  const boundaryBuffer = Buffer.from('--' + boundary);
  const boundaryStr = boundaryBuffer.toString('binary');
  const sections = body.toString('binary').split(boundaryStr);
  for (const section of sections) {
    if (!section || !section.includes('\r\n\r\n')) continue;
    const [headers, ...bodyParts] = section.split('\r\n\r\n');
    const nameMatch = headers.match(/name="([^"]+)"/);
    const filenameMatch = headers.match(/filename="([^"]+)"/);
    if (!nameMatch) continue;
    const name = nameMatch[1];
    const bodyContent = bodyParts.join('\r\n\r\n').replace(/\r\n$/, '');
    if (filenameMatch) {
      let safeContent;
      try {
        if (Buffer.isBuffer(bodyContent)) {
          safeContent = bodyContent;
        } else if (typeof bodyContent === 'string') {
          safeContent = Buffer.from(bodyContent, 'binary');
        } else if (bodyContent instanceof ArrayBuffer) {
          safeContent = Buffer.from(new Uint8Array(bodyContent));
        } else if (bodyContent) {
          safeContent = Buffer.from(String(bodyContent), 'binary');
        } else {
          safeContent = Buffer.alloc(0);
        }
      } catch (e) {
        console.error('Buffer creation error:', e.message);
        safeContent = Buffer.alloc(0);
      }
      parts[name] = safeContent;
    } else {
      parts[name] = String(bodyContent || '').trim();
    }
  }
  return parts;
}

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

const server = http.createServer((incomingReq, serverRes) => {
  console.log(`${incomingReq.method} ${incomingReq.url}`);

  serverRes.setHeader('Access-Control-Allow-Origin', '*');
  serverRes.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  serverRes.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (incomingReq.method === 'OPTIONS') {
    serverRes.writeHead(200);
    serverRes.end();
    return;
  }

  // Serve sitemap.xml and robots.txt
  if (incomingReq.method === 'GET' && (incomingReq.url === '/sitemap.xml' || incomingReq.url === '/robots.txt')) {
    const staticPath = path.join(__dirname, incomingReq.url);
    fs.readFile(staticPath, (err, content) => {
      if (err) {
        serverRes.writeHead(404);
        serverRes.end('Not found');
      } else {
        serverRes.writeHead(200, { 'Content-Type': mimeTypes[path.extname(staticPath)] || 'text/plain' });
        serverRes.end(content);
      }
    });
    return;
  }

  // API: Health check
  if (incomingReq.method === 'GET' && incomingReq.url === '/api/health') {
    serverRes.writeHead(200, { 'Content-Type': 'application/json' });
    serverRes.end(JSON.stringify({ status: 'ok', time: new Date().toISOString() }));
    return;
  }

  // API: Daily stats
  if (incomingReq.method === 'GET' && incomingReq.url === '/api/stats') {
    const opts = {
      hostname: 'kxnqwpavjhiphgvkevvj.supabase.co',
      path: '/auth/v1/admin/users?page=1&per_page=1',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY
      }
    };
    const sreq = https.request(opts, (sres) => {
      let data = '';
      sres.on('data', chunk => data += chunk);
      sres.on('end', () => {
        try {
          const json = JSON.parse(data);
          const count = json.total || json.users?.length || 0;
          serverRes.writeHead(200, { 'Content-Type': 'application/json' });
          serverRes.end(JSON.stringify({ userCount: count }));
        } catch (e) {
          serverRes.writeHead(500);
          serverRes.end('{}');
        }
      });
    });
    sreq.on('error', () => {
      serverRes.writeHead(500);
      serverRes.end('{}');
    });
    sreq.end();
    return;
  }

  // API: Get community voices
  if (incomingReq.method === 'GET' && incomingReq.url === '/api/community-voices') {
    if (!SUPABASE_SERVICE_KEY) {
      serverRes.writeHead(500, { 'Content-Type': 'application/json' });
      serverRes.end(JSON.stringify({ error: 'SUPABASE_SERVICE_KEY not set' }));
      return;
    }
    const voicesUrl = `${SUPABASE_URL}/rest/v1/community_voices?select=voice_id,name,accent,pitch,describe1,describe2,uses,created_at,contributor_id&order=created_at.desc`;
    const parsedUrl = new URL(voicesUrl);
    const supaReq = https.request(
      {
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname + parsedUrl.search,
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        },
        method: 'GET'
      },
      (supaRes) => {
        let data = '';
        supaRes.on('data', chunk => data += chunk);
        supaRes.on('end', () => {
          try {
            const voices = JSON.parse(data);
            serverRes.writeHead(200, { 'Content-Type': 'application/json' });
            serverRes.end(JSON.stringify({ voices }));
          } catch (e) {
            serverRes.writeHead(500, { 'Content-Type': 'application/json' });
            serverRes.end(JSON.stringify({ error: 'Failed to load community voices' }));
          }
        });
      }
    );
    supaReq.on('error', (e) => {
      console.error('Community voices error:', e.message);
      serverRes.writeHead(500, { 'Content-Type': 'application/json' });
      serverRes.end(JSON.stringify({ error: e.message }));
    });
    supaReq.end();
    return;
  }

  // API: Clone a voice
  if (incomingReq.method === 'POST' && incomingReq.url === '/api/clone-voice') {
    console.log('=== CLONE VOICE REQUEST ===');
    const authHeader = incomingReq.headers.authorization;
    console.log('Auth header present:', !!authHeader);
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      serverRes.writeHead(401, { 'Content-Type': 'application/json' });
      serverRes.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    const token = authHeader.split(' ')[1];
    console.log('Token present:', !!token);
    const chunks = [];
    incomingReq.on('data', chunk => chunks.push(chunk));
    incomingReq.on('end', async () => {
      console.log('Body received, chunks:', chunks.length);
      const body = Buffer.concat(chunks);
      console.log('Body length:', body.length);
      const contentType = incomingReq.headers['content-type'] || '';
      console.log('Content-Type:', contentType);
      const boundary = contentType.split('boundary=')[1];
      console.log('Boundary:', boundary ? 'present' : 'MISSING');
      if (!boundary) {
        serverRes.writeHead(400, { 'Content-Type': 'application/json' });
        serverRes.end(JSON.stringify({ error: 'Invalid form data' }));
        return;
      }

      let parts;
      try {
        parts = parseMultipart(body, boundary);
        console.log('Parsed parts:', Object.keys(parts));
      } catch (e) {
        console.error('Parse error:', e.message);
        serverRes.writeHead(400, { 'Content-Type': 'application/json' });
        serverRes.end(JSON.stringify({ error: 'Failed to parse form data: ' + e.message }));
        return;
      }

      const name = parts.name || '';
      const isPublic = parts.public === 'true';
      const accent = parts.accent || '';
      const pitch = parts.pitch || '';
      const desc1 = parts.desc1 || '';
      const desc2 = parts.desc2 || '';
      const audioData = parts.audio;
      console.log('name:', name, '| audioData:', audioData ? (audioData.constructor.name + ' len=' + audioData.length) : 'MISSING');

      if (!name) {
        serverRes.writeHead(400, { 'Content-Type': 'application/json' });
        serverRes.end(JSON.stringify({ error: 'Voice name is required' }));
        return;
      }
      if (!audioData || !Buffer.isBuffer(audioData) || audioData.length === 0) {
        serverRes.writeHead(400, { 'Content-Type': 'application/json' });
        serverRes.end(JSON.stringify({ error: 'No audio recording found. Please record your voice first.' }));
        return;
      }

      try {
        if (!token || !token.includes('.')) {
          throw new Error('Invalid token format');
        }
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        const userId = payload.sub;
        console.log('Clone voice for user:', userId, '| audio size:', audioData.length);

        const voiceId = uuidv4();
        const storagePath = `${userId}/${voiceId}/reference.webm`;

        // Upload to Supabase Storage
        const uploadResp = await fetch(
          `${SUPABASE_URL}/storage/v1/object/voice-samples/${storagePath}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
              'Content-Type': 'audio/webm',
              'x-upsert': 'true'
            },
            body: audioData
          }
        );
        if (!uploadResp.ok) {
          const errText = await uploadResp.text();
          throw new Error('Failed to upload voice sample: ' + errText);
        }

        const audioSampleUrl = `${SUPABASE_URL}/storage/v1/object/public/voice-samples/${storagePath}`;

        // Store in community_voices table
        await fetch(
          `${SUPABASE_URL}/rest/v1/community_voices`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
            },
            body: JSON.stringify({
              voice_id: voiceId,
              name: name,
              contributor_id: userId,
              audio_sample_url: audioSampleUrl,
              accent: accent,
              pitch: pitch,
              describe1: desc1,
              describe2: desc2,
              uses: 0
            })
          }
        );

        serverRes.writeHead(200, { 'Content-Type': 'application/json' });
        serverRes.end(JSON.stringify({
          success: true,
          voiceId,
          message: 'Your voice sample has been submitted to the community library!'
        }));

      } catch (err) {
        console.error('Clone voice error:', err.message, err.stack);
        serverRes.writeHead(500, { 'Content-Type': 'application/json' });
        serverRes.end(JSON.stringify({ error: 'Internal error: ' + err.message }));
      }
    });
    return;
  }

  // API: TTS
  if (incomingReq.method === 'POST' && incomingReq.url === '/api/tts') {
    let body = '';
    incomingReq.on('data', chunk => body += chunk);
    incomingReq.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const { voiceKey, text, speed, format } = data;
        const voice = VOICES[voiceKey] || VOICES['brian'];

        let userId = null;
        const authHeader = incomingReq.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          try {
            const token = authHeader.split(' ')[1];
            const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
            userId = payload.sub;
          } catch (e) { /* ignore */ }
        }

        if (!RUNPOD_API_KEY) {
          throw new Error('RunPod API key not configured');
        }

        const runpodFormat = format === 'flac_44100_16bit' ? 'flac' : 'wav';
        const isCustomVoice = !VOICES[voiceKey];

        if (isCustomVoice) {
          if (!userId) {
            serverRes.writeHead(401, { 'Content-Type': 'application/json' });
            serverRes.end(JSON.stringify({ error: 'Login required for custom voices' }));
            return;
          }

          // Fetch community voice audio
          const communityRes = await fetch(
            `${SUPABASE_URL}/rest/v1/community_voices?voice_id=eq.${voiceKey}&select=audio_sample_url,contributor_id`,
            {
              headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
              }
            }
          );
          const communityData = await communityRes.json();
          let audioSampleUrl = communityData?.[0]?.audio_sample_url;
          const contributorId = communityData?.[0]?.contributor_id;

          // Fallback: construct URL from storage path if audio_sample_url is null
          if (!audioSampleUrl && contributorId) {
            audioSampleUrl = `${SUPABASE_URL}/storage/v1/object/public/voice-samples/${contributorId}/${voiceKey}/reference.webm`;
          }

          if (!audioSampleUrl) {
            serverRes.writeHead(400, { 'Content-Type': 'application/json' });
            serverRes.end(JSON.stringify({ error: 'Custom voice audio not found' }));
            return;
          }

          // Fetch reference audio
          const refAudioResp = await fetch(audioSampleUrl);
          if (!refAudioResp.ok) throw new Error('Failed to fetch reference audio');
          const refAudioBuffer = await refAudioResp.arrayBuffer();
          const refAudioBase64 = Buffer.from(new Uint8Array(refAudioBuffer)).toString('base64');

          // Call Fish Speech
          const fishResp = await fetch(
            `https://api.runpod.ai/v2/${RUNPOD_FISH_ENDPOINT_ID}/run`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${RUNPOD_FISH_SPEECH}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                input: {
                  text: text.slice(0, 5000),
                  format: 'wav',
                  reference_audio: [refAudioBase64],
                  reference_text: [''],
                  chunk_length: 300
                }
              })
            }
          );

          const fishData = await fishResp.json();

          if (fishData.status === 'IN_QUEUE' || fishData.status === 'IN_PROGRESS') {
            const jobId = fishData.id;
            let waited = 0;
            while (waited < 180) {
              await new Promise(r => setTimeout(r, 15000));
              waited += 15;
              const statusResp = await fetch(
                `https://api.runpod.ai/v2/${RUNPOD_FISH_ENDPOINT_ID}/status/${jobId}`,
                { headers: { 'Authorization': `Bearer ${RUNPOD_FISH_SPEECH}` } }
              );
              const statusData = await statusResp.json();
              if (statusData.status === 'COMPLETED') {
                const audioBytes = Buffer.from(statusData.output.audio_base64, 'base64');
                serverRes.writeHead(200, { 'Content-Type': 'audio/wav' });
                serverRes.end(audioBytes);
                return;
              } else if (statusData.status === 'FAILED') {
                throw new Error('Fish Speech generation failed');
              }
            }
            throw new Error('Fish Speech timed out');
          } else if (fishData.output?.audio_base64) {
            const audioBytes = Buffer.from(fishData.output.audio_base64, 'base64');
            serverRes.writeHead(200, { 'Content-Type': 'audio/wav' });
            serverRes.end(audioBytes);
            return;
          } else {
            throw new Error('Fish Speech returned unexpected response');
          }
        } else {
          // Preset voice
          const response = await fetch('https://api.runpod.ai/v2/chatterbox-turbo/runsync', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${RUNPOD_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              input: {
                prompt: text,
                voice: voice.id,
                format: runpodFormat
              }
            })
          });

          if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(`RunPod error ${response.status}: ${err.error || 'Unknown'}`);
          }

          const result = await response.json();

          if (result.status === 'FAILED') {
            throw new Error('Generation failed: ' + (result.error || 'Unknown error'));
          }

          const audioResponse = await fetch(result.output.audio_url);
          if (!audioResponse.ok) throw new Error('Failed to fetch audio from RunPod');
          const audioBuffer = await audioResponse.arrayBuffer();

          serverRes.writeHead(200, { 'Content-Type': 'audio/wav' });
          serverRes.end(Buffer.from(new Uint8Array(audioBuffer)));
        }

      } catch (error) {
        console.error('TTS error:', error);
        serverRes.writeHead(500, { 'Content-Type': 'application/json' });
        serverRes.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  // Serve static files
  let filePath = path.join(__dirname, incomingReq.url === '/' ? 'index.html' : incomingReq.url);

  fs.readFile(filePath, (err, content) => {
    if (err) {
      serverRes.writeHead(404);
      serverRes.end('not found');
    } else {
      const ext = path.extname(filePath);
      serverRes.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      serverRes.end(content);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`VoxLibrary server running on port ${PORT}`);
});

// Voice mapping
const VOICES = {
  'andy': { id: 'andy', name: 'Andy', desc: 'Smooth & Trustworthy' },
  'brian': { id: 'brian', name: 'Brian', desc: 'Deep & Professional' },
  'archer': { id: 'archer', name: 'Archer', desc: 'Sharp & Clear' },
  'madison': { id: 'madison', name: 'Madison', desc: 'Bright & Energetic' },
  'walter': { id: 'walter', name: 'Walter', desc: 'Mature & Authoritative' },
  'gavin': { id: 'gavin', name: 'Gavin', desc: 'British & Distinguished' },
  'aaron': { id: 'aaron', name: 'Aaron', desc: 'Casual & Approachable' },
  'emmanuel': { id: 'emmanuel', name: 'Emmanuel', desc: 'Deep & Steady' },
  'abigail': { id: 'abigail', name: 'Abigail', desc: 'Clear & Confident' },
  'anaya': { id: 'anaya', name: 'Anaya', desc: 'Modern & Dynamic' },
  'chloe': { id: 'chloe', name: 'Chloe', desc: 'Australian & Fun' },
  'dylan': { id: 'dylan', name: 'Dylan', desc: 'Relaxed & Cool' },
  'ethan': { id: 'ethan', name: 'Ethan', desc: 'Deep & Trustworthy' },
  'marisol': { id: 'marisol', name: 'Marisol', desc: 'Young & Fresh' },
  'evelyn': { id: 'evelyn', name: 'Evelyn', desc: 'Calm & Nurturing' },
  'ivan': { id: 'ivan', name: 'Ivan', desc: 'Deep & Reliable' },
  'laura': { id: 'laura', name: 'Laura', desc: 'Friendly & Warm' },
  'meera': { id: 'meera', name: 'Meera', desc: 'Expressive & Dynamic' },
  'roger': { id: 'brian', name: 'Roger', desc: 'Confident & Clear' },
};
