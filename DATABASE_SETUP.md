# VoxLibrary Local Database Setup

This guide walks you through setting up the local SQLite database for voice samples and migrating existing community voices from Supabase.

## Prerequisites

- Node.js installed
- Existing `community_voices.json` file (backup of Supabase data)

## Step 1: Install Dependencies

```bash
npm install better-sqlite3
```

## Step 2: Set Up the Database

Run the database setup script to create tables and indexes:

```bash
node setup-database.js
```

This creates:
- `voice_samples` table - stores voice metadata and optional audio BLOBs
- `community_voices` table - mirrors Supabase structure
- Indexes for fast queries

Output file: `voxlibrary.db`

## Step 3: Migrate Data from Supabase

Run the migration script to download existing community voices:

```bash
# Option A: With Supabase credentials (pulls from cloud)
set SUPABASE_SERVICE_KEY=your_service_key
node migrate-supabase.js

# Option B: From JSON file (if no Supabase access)
node migrate-supabase.js
```

The script will:
1. Try to fetch from Supabase API
2. Fall back to `community_voices.json` if Supabase fails
3. Insert all voices into the local SQLite database

## Step 4: Update Server Code

Replace `serve.js` with `serve-updated.js`:

```bash
copy serve.js serve.js.backup
copy serve-updated.js serve.js
```

Or update `package.json` main entry:
```json
{
  "main": "serve-updated.js"
}
```

## Step 5: Start the Server

```bash
npm start
```

## Database Features

### Local Storage Benefits
- ✓ Audio data stored locally (no cloud dependency for playback)
- ✓ Faster voice lookups
- ✓ Works offline
- ✓ Automatic JSON backup sync

### API Changes

The updated server now:
1. **Reads community voices** from local SQLite first, falls back to Supabase
2. **Stores new voice submissions** in both local DB and Supabase
3. **Serves audio** from local database if available, otherwise fetches from Supabase Storage
4. **Maintains JSON backup** (`community_voices.json`) automatically

### Database Schema

**voice_samples table:**
- `id` - Primary key
- `voice_id` - UUID (unique)
- `name` - Voice name
- `contributor_id` - User UUID
- `audio_data` - BLOB (optional, local storage)
- `audio_sample_url` - URL to Supabase Storage
- `accent`, `pitch`, `describe1`, `describe2` - Voice attributes
- `uses` - Usage counter
- `is_public` - Visibility flag
- `created_at`, `updated_at` - Timestamps

**community_voices table:**
- Matches Supabase structure exactly
- Used for listing/searching voices
- References audio via `audio_sample_url`

## Environment Variables

```bash
# Optional: Custom database path
set DB_PATH=C:\path\to\voxlibrary.db

# Required for Supabase sync
set SUPABASE_SERVICE_KEY=your_key
set SUPABASE_URL=https://kxnqwpavjhiphgvkevvj.supabase.co
```

## Troubleshooting

### "better-sqlite3 not found"
```bash
npm install better-sqlite3
```

### "Database locked"
- SQLite WAL mode is enabled for better concurrency
- Restart the server if you encounter locks

### "No voices in database"
```bash
# Re-run migration
node migrate-supabase.js

# Or manually sync from JSON
node -e "const db = require('./db.js'); db.init(); db.syncFromJSON('./community_voices.json'); db.close();"
```

## File Structure

```
voxlibrary_new/
├── serve.js                 # Updated server (uses local DB)
├── serve-updated.js         # New server code
├── serve.js.backup        # Original server backup
├── db.js                  # Database module
├── setup-database.js      # Database setup script
├── migrate-supabase.js    # Migration script
├── voxlibrary.db          # SQLite database (created)
├── community_voices.json  # JSON backup
└── DATABASE_SETUP.md      # This file
```

## Rollback

To revert to original Supabase-only mode:
```bash
copy serve.js.backup serve.js
```

Then restart the server.
