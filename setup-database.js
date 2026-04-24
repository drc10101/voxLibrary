const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'voxlibrary.db');

console.log('Setting up SQLite database...');
console.log('Database path:', DB_PATH);

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');

// Create voice_samples table
db.exec(`
  CREATE TABLE IF NOT EXISTS voice_samples (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    voice_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    accent TEXT,
    pitch TEXT,
    describe1 TEXT,
    describe2 TEXT,
    audio_data BLOB,
    audio_path TEXT,
    uses INTEGER DEFAULT 0,
    contributor_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_public BOOLEAN DEFAULT 1
  )
`);

// Create voice_clones table for user-uploaded voices
db.exec(`
  CREATE TABLE IF NOT EXISTS voice_clones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    clone_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    user_id TEXT,
    reference_audio_path TEXT,
    is_private BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    uses INTEGER DEFAULT 0
  )
`);

// Create users table for local tracking
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    plan TEXT DEFAULT 'trial',
    chars_remaining INTEGER DEFAULT 2000,
    days_left INTEGER DEFAULT 5,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

console.log('Database tables created:');
console.log('  - voice_samples');
console.log('  - voice_clones');
console.log('  - users');

// Check if we have existing community_voices.json and import it
const jsonPath = path.join(__dirname, 'community_voices.json');
if (fs.existsSync(jsonPath)) {
  console.log('\nImporting community_voices.json...');
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  
  const insert = db.prepare(`
    INSERT OR IGNORE INTO voice_samples 
    (voice_id, name, accent, pitch, describe1, describe2, uses, contributor_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const insertMany = db.transaction((voices) => {
    for (const voice of voices) {
      insert.run(
        voice.voice_id,
        voice.name,
        voice.accent,
        voice.pitch,
        voice.describe1,
        voice.describe2,
        voice.uses || 0,
        voice.contributor_id,
        voice.created_at
      );
    }
  });
  
  insertMany(data);
  console.log(`Imported ${data.length} voices from JSON`);
}

// Show current count
const count = db.prepare('SELECT COUNT(*) as count FROM voice_samples').get();
console.log(`\nTotal voices in database: ${count.count}`);

db.close();
console.log('\nDatabase setup complete!');
