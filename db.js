/**
 * Database Module for VoxLibrary
 * SQLite wrapper with methods for voice_samples and community_voices
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'voxlibrary.db');

class VoxLibraryDB {
  constructor() {
    this.db = null;
  }

  init() {
    if (this.db) return this.db;

    // Create data directory if needed
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new Database(DB_PATH);
    this.db.pragma('journal_mode = WAL');
    
    this.createTables();
    return this.db;
  }

  createTables() {
    // voice_samples table for storing voice data with optional audio blob
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS voice_samples (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        voice_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        contributor_id TEXT NOT NULL,
        audio_data BLOB,
        audio_sample_url TEXT,
        accent TEXT,
        pitch TEXT,
        describe1 TEXT,
        describe2 TEXT,
        uses INTEGER DEFAULT 0,
        is_public INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // community_voices table (matches Supabase structure)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS community_voices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        voice_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        contributor_id TEXT NOT NULL,
        audio_sample_url TEXT,
        accent TEXT,
        pitch TEXT,
        describe1 TEXT,
        describe2 TEXT,
        uses INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_voice_samples_contributor ON voice_samples(contributor_id);
      CREATE INDEX IF NOT EXISTS idx_voice_samples_voice_id ON voice_samples(voice_id);
      CREATE INDEX IF NOT EXISTS idx_community_voices_contributor ON community_voices(contributor_id);
      CREATE INDEX IF NOT EXISTS idx_community_voices_voice_id ON community_voices(voice_id);
      CREATE INDEX IF NOT EXISTS idx_community_voices_created ON community_voices(created_at DESC);
    `);
  }

  // ========== Community Voices Methods ==========

  getCommunityVoices(limit = 100, offset = 0) {
    const stmt = this.db.prepare(`
      SELECT voice_id, name, accent, pitch, describe1, describe2, uses, created_at, contributor_id
      FROM community_voices
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);
    return stmt.all(limit, offset);
  }

  getCommunityVoiceById(voiceId) {
    const stmt = this.db.prepare(`
      SELECT voice_id, name, contributor_id, audio_sample_url, accent, pitch, describe1, describe2, uses, created_at
      FROM community_voices
      WHERE voice_id = ?
    `);
    return stmt.get(voiceId);
  }

  insertCommunityVoice(voice) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO community_voices 
      (voice_id, name, contributor_id, audio_sample_url, accent, pitch, describe1, describe2, uses, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
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

  incrementVoiceUses(voiceId) {
    const stmt = this.db.prepare(`
      UPDATE community_voices 
      SET uses = uses + 1 
      WHERE voice_id = ?
    `);
    return stmt.run(voiceId);
  }

  // ========== Voice Samples Methods ==========

  getVoiceSample(voiceId) {
    const stmt = this.db.prepare(`
      SELECT * FROM voice_samples WHERE voice_id = ?
    `);
    return stmt.get(voiceId);
  }

  getVoiceSamplesByContributor(contributorId) {
    const stmt = this.db.prepare(`
      SELECT voice_id, name, accent, pitch, describe1, describe2, uses, created_at, is_public
      FROM voice_samples
      WHERE contributor_id = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(contributorId);
  }

  insertVoiceSample(sample) {
    const stmt = this.db.prepare(`
      INSERT INTO voice_samples 
      (voice_id, name, contributor_id, audio_data, audio_sample_url, accent, pitch, describe1, describe2, is_public, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      sample.voice_id,
      sample.name,
      sample.contributor_id,
      sample.audio_data || null,
      sample.audio_sample_url || null,
      sample.accent || null,
      sample.pitch || null,
      sample.describe1 || null,
      sample.describe2 || null,
      sample.is_public !== undefined ? (sample.is_public ? 1 : 0) : 1,
      sample.created_at || new Date().toISOString()
    );
  }

  getVoiceAudioData(voiceId) {
    const stmt = this.db.prepare(`
      SELECT audio_data FROM voice_samples WHERE voice_id = ?
    `);
    const result = stmt.get(voiceId);
    return result ? result.audio_data : null;
  }

  // ========== JSON Fallback Methods ==========

  loadFromJSON(jsonPath) {
    try {
      if (!fs.existsSync(jsonPath)) {
        console.log('[DB] JSON file not found:', jsonPath);
        return [];
      }
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      console.log('[DB] Loaded', data.length, 'voices from JSON');
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.error('[DB] Error loading JSON:', e.message);
      return [];
    }
  }

  syncFromJSON(jsonPath) {
    const voices = this.loadFromJSON(jsonPath);
    const insert = this.db.prepare(`
      INSERT OR REPLACE INTO community_voices 
      (voice_id, name, contributor_id, audio_sample_url, accent, pitch, describe1, describe2, uses, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const transaction = this.db.transaction((voices) => {
      for (const v of voices) {
        insert.run(
          v.voice_id,
          v.name,
          v.contributor_id,
          v.audio_sample_url || null,
          v.accent || null,
          v.pitch || null,
          v.describe1 || null,
          v.describe2 || null,
          v.uses || 0,
          v.created_at || new Date().toISOString()
        );
      }
    });
    
    transaction(voices);
    console.log('[DB] Synced', voices.length, 'voices from JSON to database');
    return voices.length;
  }

  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Singleton instance
const dbInstance = new VoxLibraryDB();

module.exports = dbInstance;
