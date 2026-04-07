const http = require('http');
const fs = require('fs');
const path = require('path');
const Stripe = require('stripe');

const PORT = process.env.PORT || 8080;
const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const stripe = Stripe(STRIPE_SECRET_KEY);
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kxnqwpavjhiphgvkevvj.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; // Service role key for admin

// Voice mapping (Chatterbox Turbo preset voices + matching existing images)
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

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

    // Serve sitemap.xml and robots.txt directly
  if (req.method === 'GET' && (req.url === '/sitemap.xml' || req.url === '/robots.txt')) {
    const staticPath = path.join(__dirname, req.url);
    const ext = path.extname(staticPath);
    const contentType = mimeTypes[ext] || 'text/plain';
    fs.readFile(staticPath, (err, content) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      }
    });
    return;
  }

// API: TTS via RunPod Chatterbox Turbo (proxy to keep API key secure)
  if (req.method === 'POST' && req.url === '/api/tts') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const { voiceKey, text, speed, format } = data;
        const voice = VOICES[voiceKey] || VOICES['brian'];

        if (!RUNPOD_API_KEY) {
          throw new Error('RunPod API key not configured');
        }

        const runpodFormat = format === 'flac_44100_16bit' ? 'flac' : 'wav';

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

        // Download audio from RunPod and stream back to browser (avoids CORS issues)
        const audioResponse = await fetch(result.output.audio_url);
        if (!audioResponse.ok) throw new Error('Failed to fetch audio from RunPod');
        const audioBuffer = await audioResponse.arrayBuffer();

        res.writeHead(200, { 'Content-Type': 'audio/wav' });
        res.end(Buffer.from(audioBuffer));

      } catch (error) {
        console.error('TTS error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  // API: Generate audio (legacy - kept for backward compatibility)
  if (req.method === 'POST' && req.url === '/api/generate') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const { voiceKey, text, speed, stability, similarity, style, format } = data;
        const voice = VOICES[voiceKey] || VOICES['brian'];

        if (!RUNPOD_API_KEY) {
          throw new Error('RunPod API key not configured');
        }

        const runpodFormat = format === 'flac_44100_16bit' ? 'flac' : 'wav';

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

        if (!response.ok) throw new Error(`RunPod error: ${response.status}`);

        const result = await response.json();
        const audioResponse = await fetch(result.output.audio_url);
        const audioBuffer = await audioResponse.arrayBuffer();

        res.writeHead(200, { 'Content-Type': runpodFormat === 'flac' ? 'audio/flac' : 'audio/wav' });
        res.end(Buffer.from(audioBuffer));

      } catch (error) {
        console.error('Generation error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  // API: Stripe billing portal
  if (req.method === 'POST' && req.url === '/api/billing-portal') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { email, returnUrl } = JSON.parse(body);

        if (!STRIPE_SECRET_KEY) throw new Error('Stripe not configured');

        // Find or create customer
        let customer;
        const existing = await stripe.customers.list({ email, limit: 1 });
        if (existing.data.length > 0) {
          customer = existing.data[0];
        } else {
          customer = await stripe.customers.create({ email });
        }

        // Create portal session
        const session = await stripe.billingPortal.sessions.create({
          customer: customer.id,
          return_url: returnUrl || 'https://web-production-5f469.up.railway.app/'
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ url: session.url }));

      } catch (error) {
        console.error('Billing portal error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  // API: Stripe webhook
  if (req.method === 'POST' && req.url === '/api/webhook') {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let rawBody = '';
    req.on('data', chunk => rawBody += chunk);
    req.on('end', async () => {
      // Respond immediately with 200 to acknowledge receipt
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{"received":true}');

      console.log('=== WEBHOOK RECEIVED ===');
      console.log('Has signature:', !!sig);
      console.log('Has webhook secret:', !!webhookSecret);

      try {
        let event;
        if (webhookSecret && sig) {
          try {
            event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
            console.log('Signature verified OK');
          } catch (verifyError) {
            console.log('Signature verification failed:', verifyError.message);
            event = JSON.parse(rawBody);
          }
        } else {
          event = JSON.parse(rawBody);
        }

        console.log('Event type:', event.type);

        if (event.type === 'invoice.paid' || event.type === 'checkout.session.completed') {
          let customerEmail;
          let priceId;

          if (event.type === 'invoice.paid') {
            const invoice = event.data.object;
            customerEmail = invoice.customer_email;
            const lineItem = invoice.lines?.data[0];
            priceId = lineItem?.pricing?.price_details?.price;
            console.log('Invoice - email:', customerEmail, 'price:', priceId);
          } else {
            const session = event.data.object;
            customerEmail = session.customer_details?.email;
            if (session.subscription) {
              const subscription = await stripe.subscriptions.retrieve(session.subscription);
              priceId = subscription.items.data[0]?.price.id;
            }
            console.log('Checkout - email:', customerEmail, 'price:', priceId);
          }

          const PRICE_TO_PLAN = {
            'price_1TIGvyGfRLc2oae0fw5dEEYU': 'starter',
            'price_1TIGvzGfRLc2oae0ljAG06ij': 'creator',
            'price_1TIGw0GfRLc2oae0hveGx70E': 'studio',
            'price_1TIGw0GfRLc2oae0lsHC0bfO': 'pro',
          };

          const plan = PRICE_TO_PLAN[priceId] || 'starter';
          console.log('Mapped plan:', plan);

          if (!customerEmail) {
            console.log('ERROR: No customer email!');
            return;
          }

          if (!SUPABASE_SERVICE_KEY) {
            console.log('ERROR: No SUPABASE_SERVICE_KEY!');
            return;
          }

          console.log('Looking up user by email:', customerEmail);
          const response = await fetch(
            `${SUPABASE_URL}/rest/v1/auth.users?email=eq.${encodeURIComponent(customerEmail)}&select=id`,
            {
              headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
              }
            }
          );
          console.log('Auth lookup status:', response.status);
          const users = await response.json();
          console.log('Users found:', JSON.stringify(users));

          if (!users || users.length === 0) {
            console.log('ERROR: No user found for email!');
            return;
          }

          const userId = users[0].id;
          console.log('Found user ID:', userId);

          console.log('Updating profile to plan:', plan);
          const updateResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`,
            {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Prefer': 'return=minimal'
              },
              body: JSON.stringify({ plan: plan, chars_used: 0 })
            }
          );
          console.log('Update status:', updateResponse.status);
          console.log('SUCCESS for', customerEmail, '->', plan);
        }
      } catch (error) {
        console.error('Webhook error:', error.message);
      }

      console.log('=== WEBHOOK DONE ===');
    });
    return;
  }

  // Serve static files
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
