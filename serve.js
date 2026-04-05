const http = require('http');
const fs = require('fs');
const path = require('path');
const Stripe = require('stripe');

const PORT = process.env.PORT || 8080;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const stripe = Stripe(STRIPE_SECRET_KEY);
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kxnqwpavjhiphgvkevvj.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; // Service role key for admin

// Voice mapping
const VOICES = {
  'eric': { id: 'cjVigY5qzO86Huf0OWal', name: 'Eric', desc: 'Smooth & Trustworthy' },
  'sarah': { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', desc: 'Mature & Confident' },
  'charlie': { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', desc: 'Deep & Energetic' },
  'george': { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', desc: 'Warm Storyteller' },
  'laura': { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura', desc: 'Enthusiastic & Quirky' },
  'liam': { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', desc: 'Social Media Creator' },
  'alice': { id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice', desc: 'Clear Educator' },
  'matilda': { id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda', desc: 'Knowledgeable Pro' },
  'will': { id: 'bIHbv24MWmeRgasZH58o', name: 'Will', desc: 'Relaxed Optimist' },
  'jessica': { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', desc: 'Playful & Warm' },
  'chris': { id: 'iP95p4xoKVk53GoZ742B', name: 'Chris', desc: 'Down-to-Earth' },
  'brian': { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', desc: 'Deep & Comforting' },
  'daniel': { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', desc: 'Steady Broadcaster' },
  'harry': { id: 'SOYHLrjzK2X1ezoPC6cr', name: 'Harry', desc: 'Fierce Warrior' },
  'adam': { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', desc: 'Dominant & Firm' },
  'roger': { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger', desc: 'Laid-Back Casual' },
  'callum': { id: 'N2lVS1w4EtoT3dr4eOWO', name: 'Callum', desc: 'Husky Trickster' },
  'river': { id: 'SAz9YHcvj6GT2YYXdXww', name: 'River', desc: 'Relaxed Neutral' },
  'lily': { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', desc: 'Velvety Actress' },
  'bella': { id: 'hpp4J3VqNfWAUOO0d1Us', name: 'Bella', desc: 'Professional Bright' },
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

  // API: Generate audio
  if (req.method === 'POST' && req.url === '/api/generate') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const { voiceKey, text, speed, stability, similarity, style, format } = data;
        const voice = VOICES[voiceKey] || VOICES['eric'];

        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice.id}`, {
          method: 'POST',
          headers: {
            'Accept': format === 'wav_44100_16bit' ? 'audio/wav' : 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': ELEVENLABS_API_KEY
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
              stability: stability !== undefined ? stability : 0.5,
              similarity_boost: similarity !== undefined ? similarity : 0.75,
              style: style !== undefined ? style : 0,
              use_speaker_boost: true
            }
          })
        });

        if (!response.ok) throw new Error(`ElevenLabs error: ${response.status}`);

        const audioBuffer = await response.arrayBuffer();
        res.writeHead(200, { 'Content-Type': format === 'wav_44100_16bit' ? 'audio/wav' : 'audio/mpeg' });
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
          return_url: returnUrl || 'https://voxlibrary-production.up.railway.app/'
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

      try {
        let event;
        if (webhookSecret && sig) {
          try {
            event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
          } catch (verifyError) {
            console.log('Webhook signature verification failed:', verifyError.message);
            // Try to parse anyway for debugging
            event = JSON.parse(rawBody);
          }
        } else {
          event = JSON.parse(rawBody);
        }

        console.log('Webhook received:', event.type);

        if (event.type === 'invoice.paid' || event.type === 'checkout.session.completed') {
          // For invoice.paid, get details from the invoice
          // For checkout.session.completed, get details from the session
          let customerEmail;
          let subscriptionId;
          let priceId;
          
          if (event.type === 'invoice.paid') {
            const invoice = event.data.object;
            customerEmail = invoice.customer_email;
            subscriptionId = invoice.subscription_details?.subscription;
            // Get price from invoice lines
            const lineItem = invoice.lines?.data[0];
            priceId = lineItem?.pricing?.price_details?.price;
            console.log(`Invoice paid - Email: ${customerEmail}, Subscription: ${subscriptionId}, Price: ${priceId}`);
          } else {
            const session = event.data.object;
            customerEmail = session.customer_details?.email;
            subscriptionId = session.subscription;
            // Need to fetch subscription to get price
            if (subscriptionId) {
              const subscription = await stripe.subscriptions.retrieve(subscriptionId);
              priceId = subscription.items.data[0]?.price.id;
            }
            console.log(`Checkout - Email: ${customerEmail}, Subscription: ${subscriptionId}, Price: ${priceId}`);
          }
          
          if (!priceId) {
            console.log('No price ID found');
            return;
          }
          
          const PRICE_TO_PLAN = {
            'price_1TIGvyGfRLc2oae0fw5dEEYU': 'starter',
            'price_1TIGvzGfRLc2oae0ljAG06ij': 'creator',
            'price_1TIGw0GfRLc2oae0hveGx70E': 'studio',
            'price_1TIGw0GfRLc2oae0lsHC0bfO': 'pro',
          };
          
          const plan = PRICE_TO_PLAN[priceId] || 'starter';
          console.log(`Plan: ${plan}`);
          
          if (customerEmail && SUPABASE_SERVICE_KEY) {
            const response = await fetch(
              `${SUPABASE_URL}/rest/v1/auth.users?email=eq.${encodeURIComponent(customerEmail)}&select=id`,
              {
                headers: {
                  'apikey': SUPABASE_SERVICE_KEY,
                  'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
                }
              }
            );
            const users = await response.json();
            console.log(`Users found: ${users?.length}`);
            
            if (users && users.length > 0) {
              const userId = users[0].id;
              await fetch(
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
              console.log(`SUCCESS: Updated user ${customerEmail} to ${plan}`);
            } else {
              console.log(`No user found for ${customerEmail}`);
            }
          }
        }
      } catch (error) {
        console.error('Webhook processing error:', error.message);
      }
    });
    return;
  }

  // Helper: Update user profile in Supabase
async function updateUserProfile(supabaseUserId, updates) {
  if (!SUPABASE_SERVICE_KEY) {
    console.log('SUPABASE_SERVICE_KEY not configured, skipping profile update');
    return false;
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${supabaseUserId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(updates)
    });

    if (response.ok) {
      console.log(`Profile updated for user ${supabaseUserId}:`, updates);
      return true;
    } else {
      console.error('Failed to update profile:', response.status);
      return false;
    }
  } catch (error) {
    console.error('Profile update error:', error);
    return false;
  }
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
