/**
 * Migration Script: Supabase → SQLite
 * Downloads existing community voices from Supabase and inserts into local SQLite
 */

const Database = require('better-sqlite3');
const https = require('https');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'voxlibrary.db');
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kxnqwpavjhiphgvkevvj.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Fallback: Read from community_voices.json if Supabase fetch fails
const fs = require('fs');

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

async function fetchFromSupabase(path, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(SUPABASE_URL);
    const options = {
      hostname: parsedUrl.hostname,
      path: path,
      method: 'GET',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        ...headers
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          reject(new Error(`Failed to parse JSON: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function migrateFromSupabase() {
  log('Starting migration from Supabase to SQLite...');
  log(`Database: ${DB_PATH}`);
  log(`Supabase URL: ${SUPABASE_URL}`);

  // Check if database exists
  if (!fs.existsSync(DB_PATH)) {
    log('ERROR: Database not found. Run setup-database.js first!');
    process.exit(1);
  }

  const db = new Database(DB_PATH);

  // Check if we have Supabase credentials
  if (!SUPABASE_SERVICE_KEY) {
    log('WARNING: SUPABASE_SERVICE_KEY not set. Attempting to load from community_voices.json...');
    
    try {
      const jsonPath = path.join(__dirname, 'community_voices.json');
      if (!fs.existsSync(jsonPath)) {
        log('ERROR: community_voices.json not found');
        db.close();
        process.exit(1);
      }

      const voices = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      log(`Loaded ${voices.length} voices from community_voices.json`);

      insertVoices(db, voices);
      db.close();
      log('Migration complete!');
      return;
    } catch (e) {
      log(`ERROR: ${e.message}`);
      db.close();
      process.exit(1);
    }
  }

  // Fetch from Supabase
  try {
    log('Fetching community voices from Supabase...');
    const voices = await fetchFromSupabase('/rest/v1/community_voices?select=*');
    log(`Fetched ${voices.length} voices from Supabase`);

    insertVoices(db, voices);
    db.close();
    log('Migration complete!');
  } catch (e) {
    log(`ERROR fetching from Supabase: ${e.message}`);
    log('Falling back to community_voices.json...');
    
    try {
      const jsonPath = path.join(__dirname, 'community_voices.json');
      const voices = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      log(`Loaded ${voices.length} voices from community_voices.json`);
      insertVoices(db, voices);
    } catch (jsonErr) {
      log(`ERROR: ${jsonErr.message}`);
    }
    
    db.close();
    process.exit(1);
  }
}

function insertVoices(db, voices) {
  // Clear existing data
  const clearStmt = db.prepare('DELETE FROM community_voices');
  clearStmt.run();
  log('Cleared existing community_voices data');

  // Insert voices
  const insertStmt = db.prepare(`
    INSERT INTO community_voices 
    (voice_id, name, contributor_id, audio_sample_url, accent, pitch, describe1, describe2, uses, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertVoice = db.transaction((voices) => {
    for (const voice of voices) {
      insertStmt.run(
        voice.voice_id,
        voice.name,
        voice.contributor_id,
        voice.audio_sample_url || null,
        voice.accent || null,
        voice.pitch || null,
        voice.describe1 || null,
        voice.describe2 || null,
        voice.uses || 0,
        voice.created_at || new Date().toISOString()
      );
    }
  });

  insertVoice(voices);
  log(`Inserted ${voices.length} voices into community_voices table`);

  // Verify insertion
  const count = db.prepare('SELECT COUNT(*) as count FROM community_voices').get();
  log(`Total voices in database: ${count.count}`);
}

// Handle errors
process.on('uncaughtException', (err) => {
  log(`ERROR: ${err.message}`);
  process.exit(1);
});

migrateFromSupabase();
