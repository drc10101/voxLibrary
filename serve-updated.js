const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');
const Stripe = require('stripe');
const nodemailer = require('nodemailer');

// ===== LOCAL DATABASE IMPORT =====
const voxDB = require('./db.js');

const PORT = process.env.PORT || 8080;
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kxnqwpavjhiphgvkevvj.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
const RUNPOD_FISH_SPEECH = process.env.RUNPOD_FISH_SPEECH;
const RUNPOD_FISH_ENDPOINT_ID = process.env.RUNPOD_FISH_ENDPOINT_ID || '53xyuo8cif3b4k';
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const stripe = STRIPE_SECRET_KEY ? Stripe(STRIPE_SECRET_KEY) : null;

// Initialize local database
let dbInitialized = false;
try {
  voxDB.init();
  dbInitialized = true;
  console.log('✓ Local SQLite database initialized');
  
  // Sync from JSON on startup (fallback if database is empty)
  const jsonPath = path.join(__dirname, 'community_voices.json');
  if (fs.existsSync(jsonPath)) {
    const count = voxDB.db.prepare('SELECT COUNT(*) as count FROM community_voices').get();
    if (count.count === 0) {
      console.log('Database empty, syncing from community_voices.json...');
      voxDB.syncFromJSON(jsonPath);
    }
  }
} catch (e) {
  console.error('Database initialization failed:', e.message);
  console.log('Falling back to JSON file mode...');
}

// Email config
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const EMAIL_PORT = process.env.EMAIL_PORT || 587;
const EMAIL_USER = process.env.EMAIL_USER || 'dobilly.ai@gmail.com';
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || 'VoxLibrary <dobilly.ai@gmail.com>';

let emailTransporter = null;
if (EMAIL_PASS) {
  emailTransporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: EMAIL_PORT,
    secure: EMAIL_PORT === 465,
    auth: { user: EMAIL_USER, pass: EMAIL_PASS }
  });
  console.log('Email transporter: ready');
} else {
  console.log('Email transporter: no credentials (EMAIL_PASS not set)');
}

console.log('=== VOXLIBRARY SERVER ===');
console.log('PORT:', PORT);
console.log('Database:', dbInitialized ? 'SQLite (local)' : 'JSON fallback');
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

// ===== HELPER: Get community voices with fallback =====
async function getCommunityVoicesLocal() {
  // Try database first
  if (dbInitialized) {
    try {
      const voices = voxDB.getCommunityVoices();
      if (voices && voices.length > 0) {
        return { source: 'database', voices };
      }
    } catch (e) {
      console.error('DB query error:', e.message);
    }
  }
  
  // Fallback to JSON file
  try {
    const jsonPath = path.join(__dirname, 'community_voices.json');
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    return { source: 'json', voices: data };
  } catch (e) {
    console.error('JSON fallback error:', e.message);
    return { source: 'none', voices: [] };
  }
}

// ===== HELPER: Save voice to local database =====
async function saveVoiceToLocal(voiceData) {
  if (!dbInitialized) return false;
  
  try {
    // Save to community_voices table
    voxDB.insertCommunityVoice(voiceData);
    
    // Also save to voice_samples for audio storage if we have audio data
    if (voiceData.audio_data) {
      voxDB.insertVoiceSample({
        ...voiceData,
        is_public: true
      });
    }
    
    // Update JSON file as backup
    await updateCommunityVoicesJSON();
    return true;
  } catch (e) {
    console.error('Error saving to local DB:', e.message);
    return false;
  }
}

// ===== HELPER: Update community_voices.json =====
async function updateCommunityVoicesJSON() {
  try {
    if (!dbInitialized) return;
    const voices = voxDB.getCommunityVoices();
    fs.writeFileSync(
      path.join(__dirname, 'community_voices.json'),
      JSON.stringify(voices, null, 2)
    );
    console.log('Updated community_voices.json with', voices.length, 'voices');
  } catch (e) {
    console.error('Error updating JSON:', e.message);
  }
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

  // Serve sitemap.xml, robots.txt, and community_voices.json
  if (incomingReq.method === 'GET' && (incomingReq.url === '/sitemap.xml' || incomingReq.url === '/robots.txt' || incomingReq.url === '/community_voices.json')) {
    const staticPath = path.join(__dirname, incomingReq.url);
    fs.readFile(staticPath, (err, content) => {
      if (err) {
        console.log('File not found:', staticPath);
        serverRes.writeHead(404);
        serverRes.end('Not found');
      } else {
        const ext = path.extname(staticPath);
        serverRes.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
        serverRes.end(content);
      }
    });
    return;
  }

  // API: Health check (updated to include DB status)
  if (incomingReq.method === 'GET' && incomingReq.url === '/api/health') {
    const dbStatus = dbInitialized ? {
      connected: true,
      voices_count: 0
    } : { connected: false };
    
    if (dbInitialized) {
      try {
        const count = voxDB.db.prepare('SELECT COUNT(*) as count FROM community_voices').get();
        dbStatus.voices_count = count.count;
      } catch (e) {}
    }
    
    serverRes.writeHead(200, { 'Content-Type': 'application/json' });
    serverRes.end(JSON.stringify({ 
      status: 'ok', 
      time: new Date().toISOString(),
      database: dbStatus
    }));
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

  // API: Get community voices (UPDATED - uses local DB with Supabase fallback)
  if (incomingReq.method === 'GET' && incomingReq.url === '/api/community-voices') {
    (async () => {
      // Try local database first
      const localData = await getCommunityVoicesLocal();
      if (localData.voices.length > 0) {
        console.log(`Serving ${localData.voices.length} voices from ${localData.source}`);
        serverRes.writeHead(200, { 'Content-Type': 'application/json' });
        serverRes.end(JSON.stringify({ voices: localData.voices, source: localData.source }));
        return;
      }
      
      // Fallback to Supabase if configured
      if (SUPABASE_SERVICE_KEY) {
        try {
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
                  serverRes.end(JSON.stringify({ voices, source: 'supabase' }));
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
        } catch (e) {
          serverRes.writeHead(500, { 'Content-Type': 'application/json' });
          serverRes.end(JSON.stringify({ error: e.message }));
        }
      } else {
        serverRes.writeHead(200, { 'Content-Type': 'application/json' });
        serverRes.end(JSON.stringify({ voices: [], source: 'none' }));
      }
    })();
    return;
  }

  // API: Clone a voice (UPDATED - saves to local DB)
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
        
        // Store audio data locally if database is available
        let localAudioSaved = false;
        if (dbInitialized) {
          try {
            voxDB.insertVoiceSample({
              voice_id: voiceId,
              name: name,
              contributor_id: userId,
              audio_data: audioData,
              accent: accent,
              pitch: pitch,
              describe1: desc1,
              describe2: desc2,
              is_public: true
            });
            localAudioSaved = true;
            console.log('Audio saved to local database');
          } catch (dbErr) {
            console.error('Failed to save to local DB:', dbErr.message);
          }
        }

        // Also upload to Supabase Storage (if configured)
        let audioSampleUrl = null;
        if (SUPABASE_SERVICE_KEY) {
          try {
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
            if (uploadResp.ok) {
              audioSampleUrl = `${SUPABASE_URL}/storage/v1/object/public/voice-samples/${storagePath}`;
              console.log('Audio uploaded to Supabase:', audioSampleUrl);
            }
          } catch (uploadErr) {
            console.error('Supabase upload failed:', uploadErr.message);
          }
        }

        // Prepare voice data
        const voiceData = {
          voice_id: voiceId,
          name: name,
          contributor_id: userId,
          audio_sample_url: audioSampleUrl,
          accent: accent,
          pitch: pitch,
          describe1: desc1,
          describe2: desc2,
          uses: 0,
          created_at: new Date().toISOString()
        };

        // Save to local database (community_voices table)
        if (dbInitialized) {
          try {
            voxDB.insertCommunityVoice(voiceData);
            console.log('Voice metadata saved to local database');
            // Update JSON backup
            await updateCommunityVoicesJSON();
          } catch (dbErr) {
            console.error('Failed to save metadata to local DB:', dbErr.message);
          }
        }

        // Also store in Supabase (if configured)
        if (SUPABASE_SERVICE_KEY) {
          try {
            await fetch(
              `${SUPABASE_URL}/rest/v1/community_voices`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': SUPABASE_SERVICE_KEY,
                  'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
                },
                body: JSON.stringify(voiceData)
              }
            );
            console.log('Voice metadata saved to Supabase');
          } catch (supaErr) {
            console.error('Supabase insert failed:', supaErr.message);
          }
        }

        serverRes.writeHead(200, { 'Content-Type': 'application/json' });
        serverRes.end(JSON.stringify({
          success: true,
          voiceId,
          localSaved: localAudioSaved,
          cloudSaved: !!audioSampleUrl,
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

  // API: Send audio via email
  if (incomingReq.method === 'POST' && incomingReq.url === '/api/send-audio') {
    let body = '';
    incomingReq.on('data', chunk => body += chunk);
    incomingReq.on('end', async () => {
      try {
        const { email, audioBase64, voiceName, text, format } = JSON.parse(body);

        if (!email || !audioBase64) {
          serverRes.writeHead(400, { 'Content-Type': 'application/json' });
          serverRes.end(JSON.stringify({ error: 'email and audioBase64 required' }));
          return;
        }

        if (!emailTransporter) {
          serverRes.writeHead(503, { 'Content-Type': 'application/json' });
          serverRes.end(JSON.stringify({ error: 'Email service not configured' }));
          return;
        }

        const ext = format === 'flac_44100_16bit' ? 'flac' : 'wav';
        const filename = `voxlibrary-${voiceName || 'audio'}-${Date.now()}.${ext}`;

        await emailTransporter.sendMail({
          from: EMAIL_FROM,
          to: email,
          subject: 'Your VoxLibrary Audio',
          text: `Your generated audio is attached.\n\nVoice: ${voiceName || 'Unknown'}\nText: ${text ? text.slice(0, 200) + '...' : 'N/A'}\n\nPowered by VoxLibrary`,
          attachments: [{
            filename,
            content: Buffer.from(audioBase64, 'base64')
          }]
        });

        console.log('Audio email sent to:', email);
        serverRes.writeHead(200, { 'Content-Type': 'application/json' });
        serverRes.end(JSON.stringify({ success: true }));

      } catch (err) {
        console.error('Send audio error:', err);
        serverRes.writeHead(500, { 'Content-Type': 'application/json' });
        serverRes.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // API: Create gift code
  if (incomingReq.method === 'POST' && incomingReq.url === '/api/create-gift') {
    let body = '';
    incomingReq.on('data', chunk => body += chunk);
    incomingReq.on('end', async () => {
      try {
        const { plan, price, recipientName, recipientEmail, purchaserEmail } = JSON.parse(body);

        // Generate gift code
        const code = 'VOX-' + Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
        const chars = plan === 'chars_10k' ? 10000 : 0;

        // Save to database
        if (SUPABASE_SERVICE_KEY) {
          const planMonths = { starter: 3, creator: 6, studio: 3, pro: 12, business: 12 };
          await fetch(`${SUPABASE_URL}/rest/v1/gift_codes`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
              code,
              plan,
              characters: chars,
              months: planMonths[plan] || 1,
              price_paid: price,
              purchaser_email: purchaserEmail,
              recipient_email: recipientEmail,
              recipient_name: recipientName
            })
          });
        }

        // Send email with gift code
        if (emailTransporter) {
          await emailTransporter.sendMail({
            from: EMAIL_FROM,
            to: recipientEmail,
            subject: `You've received a VoxLibrary gift from ${recipientName || 'a friend'}!`,
            text: `Hi!\n\n${recipientName || purchaserEmail || 'Someone'} sent you a VoxLibrary gift!\n\nYour gift code: ${code}\nPlan: ${plan}\n\nVisit https://jedsvoxlibrary.com to redeem it.\n\nPowered by VoxLibrary`
          });
        }

        // Create Stripe checkout for the payment
        if (stripe && price > 0) {
          const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
              price_data: {
                currency: 'usd',
                product_data: {
                  name: `VoxLibrary Gift - ${plan}`,
                  description: `Gift code: ${code}`
                },
                unit_amount: Math.round(price * 100)
              },
              quantity: 1
            }],
            mode: 'payment',
            success_url: `https://jedsvoxlibrary.com?gift_redeemed=${code}`,
            cancel_url: `https://jedsvoxlibrary.com?gift_cancelled=true`
          });
          serverRes.writeHead(200, { 'Content-Type': 'application/json' });
          serverRes.end(JSON.stringify({ success: true, checkoutUrl: session.url }));
          return;
        }

        serverRes.writeHead(200, { 'Content-Type': 'application/json' });
        serverRes.end(JSON.stringify({ success: true, code }));

      } catch (err) {
        console.error('Create gift error:', err);
        serverRes.writeHead(500, { 'Content-Type': 'application/json' });
        serverRes.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // API: Redeem gift code
  if (incomingReq.method === 'POST' && incomingReq.url === '/api/redeem-gift') {
    let body = '';
    incomingReq.on('data', chunk => body += chunk);
    incomingReq.on('end', async () => {
      try {
        const { code } = JSON.parse(body);
        const normalizedCode = code.trim().toUpperCase();

        let userId = null;
        const authHeader = incomingReq.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          try {
            const token = authHeader.split(' ')[1];
            const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
            userId = payload.sub;
          } catch (e) { /* ignore */ }
        }

        if (!userId) {
          serverRes.writeHead(401, { 'Content-Type': 'application/json' });
          serverRes.end(JSON.stringify({ error: 'Please sign in to redeem a gift code' }));
          return;
        }

        if (!SUPABASE_SERVICE_KEY) {
          serverRes.writeHead(500, { 'Content-Type': 'application/json' });
          serverRes.end(JSON.stringify({ error: 'Service not available' }));
          return;
        }

        // Fetch gift code
        const giftResp = await fetch(
          `${SUPABASE_URL}/rest/v1/gift_codes?code=eq.${normalizedCode}&redeemed_by=is.null&select=*`,
          {
            headers: {
              'apikey': SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
            }
          }
        );
        const gifts = await giftResp.json();
        if (!gifts || gifts.length === 0) {
          throw new Error('Invalid or already redeemed gift code');
        }

        const gift = gifts[0];

        // Update gift code
        await fetch(
          `${SUPABASE_URL}/rest/v1/gift_codes?code=eq.${normalizedCode}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
            },
            body: JSON.stringify({
              redeemed_by: userId,
              redeemed_at: new Date().toISOString()
            })
          }
        );

        // Apply to user profile
        let newChars = gift.characters || 0;
        let newPlan = gift.plan;

        // Fetch current profile
        const profileResp = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=*`,
          {
            headers: {
              'apikey': SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
            }
          }
        );
        const profiles = await profileResp.json();
        const profile = profiles?.[0];

        if (profile) {
          newChars += profile.bonus_chars || 0;
          if (['starter', 'creator', 'studio', 'pro', 'business'].includes(gift.plan)) {
            newPlan = gift.plan;
          }
          await fetch(
            `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`,
            {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
              },
              body: JSON.stringify({
                plan: newPlan,
                bonus_chars: newChars,
                plan_started: new Date().toISOString()
              })
            }
          );
        }

        const planNames = { starter: 'Starter', creator: 'Creator', studio: 'Studio', pro: 'Pro', business: 'Business' };
        const msg = gift.characters
          ? `You received ${gift.characters.toLocaleString()} bonus characters!`
          : `You received the ${planNames[gift.plan] || gift.plan} plan!`;

        serverRes.writeHead(200, { 'Content-Type': 'application/json' });
        serverRes.end(JSON.stringify({ success: true, message: msg }));

      } catch (err) {
        console.error('Redeem gift error:', err);
        serverRes.writeHead(500, { 'Content-Type': 'application/json' });
        serverRes.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // API: Create private voice checkout
  if (incomingReq.method === 'POST' && incomingReq.url === '/api/create-private-voice') {
    let body = '';
    incomingReq.on('data', chunk => body += chunk);
    incomingReq.on('end', async () => {
      try {
        const { audioBase64, fileName, voiceName, userEmail } = JSON.parse(body);

        if (!audioBase64 || !voiceName || !userEmail) {
          throw new Error('Missing required fields');
        }

        if (!stripe) {
          throw new Error('Stripe not configured');
        }

        // Create Stripe checkout session for $29.99
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [{
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Private Voice Profile',
                description: `Voice: ${voiceName} - Private TTS generation`
              },
              unit_amount: 2999
            },
            quantity: 1
          }],
          mode: 'payment',
          success_url: `https://jedsvoxlibrary.com?private_voice_success=true&voice_name=${encodeURIComponent(voiceName)}`,
          cancel_url: `https://jedsvoxlibrary.com?private_voice_cancelled=true`,
          metadata: {
            audioBase64,
            fileName,
            voiceName,
            userEmail
          }
        });

        serverRes.writeHead(200, { 'Content-Type': 'application/json' });
        serverRes.end(JSON.stringify({ success: true, checkoutUrl: session.url }));

      } catch (err) {
        console.error('Create private voice error:', err);
        serverRes.writeHead(500, { 'Content-Type': 'application/json' });
        serverRes.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // API: Stripe webhook
  if (incomingReq.method === 'POST' && incomingReq.url === '/api/stripe-webhook') {
    let body = '';
    incomingReq.on('data', chunk => body += chunk);
    incomingReq.on('end', async () => {
      try {
        const sig = incomingReq.headers['stripe-signature'];
        if (!stripe || !sig) {
          serverRes.writeHead(400, { 'Content-Type': 'application/json' });
          serverRes.end(JSON.stringify({ error: 'Missing signature' }));
          return;
        }

        let event;
        try {
          event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET || '');
        } catch (err) {
          console.error('Webhook signature error:', err.message);
          serverRes.writeHead(400, { 'Content-Type': 'application/json' });
          serverRes.end(JSON.stringify({ error: 'Invalid signature' }));
          return;
        }

        if (event.type === 'checkout.session.completed') {
          const session = event.data.object;
          const { audioBase64, fileName, voiceName, userEmail } = session.metadata || {};

          if (audioBase64 && userEmail && emailTransporter) {
            console.log('Processing private voice for:', userEmail);

            // Generate audio with Fish Speech
            let generatedAudioBase64 = null;
            try {
              const refAudioBuffer = Buffer.from(audioBase64, 'base64');
              const refAudioStr = refAudioBuffer.toString('base64');

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
                      text: 'Hello! This is your private voice profile generated by VoxLibrary. Your voice clone is now ready to use whenever you need it.',
                      format: 'wav',
                      reference_audio: [refAudioStr],
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
                    generatedAudioBase64 = statusData.output.audio_base64;
                    break;
                  } else if (statusData.status === 'FAILED') {
                    break;
                  }
                }
              } else if (fishData.output?.audio_base64) {
                generatedAudioBase64 = fishData.output.audio_base64;
              }
            } catch (err) {
              console.error('Fish Speech generation error:', err);
            }

            // Send emails
            const originalExt = fileName ? fileName.split('.').pop() : 'webm';
            const originalFilename = `your-voice-source.${originalExt}`;
            const generatedFilename = `${voiceName || 'your-voice'}-generated.wav`;

            const attachments = [
              {
                filename: originalFilename,
                content: Buffer.from(audioBase64, 'base64')
              }
            ];

            if (generatedAudioBase64) {
              attachments.push({
                filename: generatedFilename,
                content: Buffer.from(generatedAudioBase64, 'base64')
              });
            }

            await emailTransporter.sendMail({
              from: EMAIL_FROM,
              to: userEmail,
              subject: `Your Private Voice Profile is ready!`,
              text: `Your VoxLibrary Private Voice Profile has been created!\n\nVoice: ${voiceName}\n\nAttached:\n1. Your original voice source file\n2. A generated sample using your voice clone\n\nTo use your private voice, log in to VoxLibrary and select it from the Community Voices section.\n\nPowered by VoxLibrary`,
              attachments
            });

            console.log('Private voice emails sent to:', userEmail);
          }
        }

        serverRes.writeHead(200, { 'Content-Type': 'application/json' });
        serverRes.end(JSON.stringify({ received: true }));

      } catch (err) {
        console.error('Webhook error:', err);
        serverRes.writeHead(500, { 'Content-Type': 'application/json' });
        serverRes.end(JSON.stringify({ error: err.message }));
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

          // Fetch community voice audio - try local DB first
          let audioSampleUrl = null;
          let audioData = null;
          
          if (dbInitialized) {
            const localVoice = voxDB.getCommunityVoiceById(voiceKey);
            if (localVoice) {
              audioSampleUrl = localVoice.audio_sample_url;
              // Also try to get audio data from voice_samples
              audioData = voxDB.getVoiceAudioData(voiceKey);
              console.log('Found voice in local DB:', voiceKey, 'has audio:', !!audioData);
            }
          }
          
          // Fallback to Supabase
          if (!audioSampleUrl && SUPABASE_SERVICE_KEY) {
            console.log('Fetching community voice from Supabase:', voiceKey);
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
            audioSampleUrl = communityData?.[0]?.audio_sample_url;
            const contributorId = communityData?.[0]?.contributor_id;
            
            if (!audioSampleUrl && contributorId) {
              audioSampleUrl = `${SUPABASE_URL}/storage/v1/object/public/voice-samples/${contributorId}/${voiceKey}/reference.webm`;
            }
          }

          if (!audioSampleUrl && !audioData) {
            console.error('No audio found for voice:', voiceKey);
            serverRes.writeHead(400, { 'Content-Type': 'application/json' });
            serverRes.end(JSON.stringify({ error: 'Custom voice audio not found' }));
            return;
          }

          let refAudioBase64;
          
          if (audioData) {
            // Use locally stored audio
            refAudioBase64 = Buffer.from(audioData).toString('base64');
          } else {
            // Fetch from URL
            console.log('Fetching reference audio from:', audioSampleUrl);
            const refAudioResp = await fetch(audioSampleUrl);
            console.log('refAudioResp status:', refAudioResp.status, refAudioResp.ok);
            if (!refAudioResp.ok) throw new Error('Failed to fetch reference audio');
            const refAudioBuffer = await refAudioResp.arrayBuffer();
            refAudioBase64 = Buffer.from(new Uint8Array(refAudioBuffer)).toString('base64');
          }

          // Call local TTS server with voice cloning
          console.log('Calling local TTS for custom voice:', voiceKey);
          const ttsResp = await fetch('http://127.0.0.1:8081/api/tts', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              text: text.slice(0, 5000),
              reference_audio: refAudioBase64
            })
          });

          if (!ttsResp.ok) {
            throw new Error('Local TTS generation failed');
          }

          const audioBuffer = await ttsResp.arrayBuffer();
          serverRes.writeHead(200, { 'Content-Type': 'audio/wav' });
          serverRes.end(Buffer.from(new Uint8Array(audioBuffer)));
          
          // Increment usage count
          if (dbInitialized) {
            try {
              voxDB.incrementVoiceUses(voiceKey);
            } catch (e) { /* ignore */ }
          }
          
          return;
        } else {
          // Local TTS server on port 8081
          console.log('Calling local TTS for voice:', voice.id, 'text length:', text.length);
          const response = await fetch('http://127.0.0.1:8081/api/tts', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              text: text,
              voice: voice.id
            })
          });
          console.log('Local TTS response status:', response.status);

          if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(`TTS error ${response.status}: ${err.error || 'Unknown'}`);
          }

          const audioBuffer = await response.arrayBuffer();
          serverRes.writeHead(200, { 'Content-Type': 'audio/wav' });
          serverRes.end(Buffer.from(new Uint8Array(audioBuffer)));
          console.log('Generation complete, sent audio');
        }

      } catch (error) {
        console.error('TTS error:', error);
        serverRes.writeHead(500, { 'Content-Type': 'application/json' });
        serverRes.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  // API: Upload voice (Bring Your Own Voice)
  if (incomingReq.method === 'POST' && incomingReq.url === '/api/upload-voice') {
    var authHeader = incomingReq.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) { serverRes.writeHead(401); serverRes.end(JSON.stringify({error:'Unauthorized'})); return; }
    var token = authHeader.split(' ')[1];
    var chunks = [];
    incomingReq.on('data', function(c) { chunks.push(c); });
    incomingReq.on('end', function() {
      var body = Buffer.concat(chunks);
      fetch(SUPABASE_URL + '/auth/v1/user', {
        headers: { 'Authorization': 'Bearer ' + token, 'apikey': SUPABASE_SERVICE_KEY }
      }).then(function(userRes) {
        if (!userRes.ok) throw new Error('Invalid token');
        return userRes.json();
      }).then(function(userData) {
        var email = userData.email;
        if (!email) throw new Error('No email found');
        var boundary = ((incomingReq.headers['content-type'] || '').split('boundary=')[1] || '');
        var parts = parseMultipart(body, boundary);
        var filePart = null, namePart = null;
        for (var k in parts) {
          if (parts[k].filename && parts[k].name === 'audio') filePart = parts[k];
          if (parts[k].name === 'name') namePart = parts[k];
        }
        if (!filePart || !namePart) throw new Error('Missing audio or name');
        var ext = (filePart.filename || 'wav').split('.').pop() || 'wav';
        var storagePath = 'private/' + email.replace(/[^a-zA-Z0-9]/g,'_') + '/' + Date.now() + '.' + ext;
        return fetch(SUPABASE_URL + '/storage/v1/object/voices/' + storagePath, {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'Content-Type': filePart.type || 'audio/wav', 'x-upsert': 'true' },
          body: filePart.data
        }).then(function(r) {
          if (!r.ok) throw new Error('Storage upload failed');
          return fetch(SUPABASE_URL + '/rest/v1/private_voices', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'apikey': SUPABASE_SERVICE_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
            body: JSON.stringify({ user_id: email, name: namePart.data.toString(), audio_url: SUPABASE_URL + '/storage/v1/object/public/voices/' + storagePath, uses: 0 })
          });
        }).then(function(r) {
          if (!r.ok) throw new Error('Database insert failed');
          serverRes.writeHead(200, { 'Content-Type': 'application/json' });
          serverRes.end(JSON.stringify({ success: true }));
        });
      }).catch(function(e) {
        console.error('Upload error:', e);
        serverRes.writeHead(500, { 'Content-Type': 'application/json' });
        serverRes.end(JSON.stringify({ error: e.message }));
      });
    });
    return;
  }

  // API: Get my private voices
  if (incomingReq.method === 'GET' && incomingReq.url === '/api/my-voices') {
    var authHeader = incomingReq.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) { serverRes.writeHead(401); serverRes.end(JSON.stringify({error:'Unauthorized'})); return; }
    var token = authHeader.split(' ')[1];
    fetch(SUPABASE_URL + '/auth/v1/user', {
      headers: { 'Authorization': 'Bearer ' + token, 'apikey': SUPABASE_SERVICE_KEY }
    }).then(function(r) {
      if (!r.ok) throw new Error('Invalid token');
      return r.json();
    }).then(function(userData) {
      var email = userData.email;
      var req = https.request({
        hostname: 'kxnqwpavjhiphgvkevvj.supabase.co',
        path: '/rest/v1/private_voices?user_id=eq.' + encodeURIComponent(email) + '&select=*',
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY, 'apikey': SUPABASE_SERVICE_KEY }
      }, function(res) {
        var d = ''; res.on('data', function(c) { d += c; });
        res.on('end', function() {
          try { serverRes.writeHead(200, { 'Content-Type': 'application/json' }); serverRes.end(d); }
          catch(e) { serverRes.writeHead(200, { 'Content-Type': 'application/json' }); serverRes.end('[]'); }
        });
      });
      req.on('error', function() { serverRes.writeHead(200, { 'Content-Type': 'application/json' }); serverRes.end('[]'); });
      req.end();
    }).catch(function() {
      serverRes.writeHead(401, { 'Content-Type': 'application/json' });
      serverRes.end(JSON.stringify({error:'Unauthorized'}));
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
