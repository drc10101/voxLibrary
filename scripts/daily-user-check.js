// Daily user count check
const https = require('https');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kxnqwpavjhiphgvkevvj.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.log('No service key available');
  process.exit(0);
}

const options = {
  hostname: 'kxnqwpavjhiphgvkevvj.supabase.co',
  path: '/auth/v1/admin/users?page=1&per_page=1',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'apikey': SUPABASE_SERVICE_KEY
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      const count = json.total || json.users?.length || 'unknown';
      console.log(`USER_COUNT:${count}`);
    } catch (e) {
      console.log('USER_COUNT:error');
    }
  });
});

req.on('error', () => {
  console.log('USER_COUNT:error');
});

req.end();
