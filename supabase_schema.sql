-- =====================================================
-- VoxLibrary Voice Cloning — Supabase Schema Updates
-- =====================================================

-- 1. Add columns to profiles table for custom voices
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS private_voices JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS public_voices JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS community_credits INTEGER DEFAULT 0;

-- 2. Create community_voices table
CREATE TABLE IF NOT EXISTS community_voices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voice_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  contributor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  audio_sample_url TEXT NOT NULL,
  accent TEXT,
  pitch TEXT,
  describe1 TEXT,
  describe2 TEXT,
  uses INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add new columns if they don't exist (for existing tables)
ALTER TABLE community_voices ADD COLUMN IF NOT EXISTS accent TEXT;
ALTER TABLE community_voices ADD COLUMN IF NOT EXISTS pitch TEXT;
ALTER TABLE community_voices ADD COLUMN IF NOT EXISTS describe1 TEXT;
ALTER TABLE community_voices ADD COLUMN IF NOT EXISTS describe2 TEXT;

-- 3. Create storage bucket for voice samples
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-samples', 'voice-samples', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Storage policies — allow authenticated users to upload their own voice samples
CREATE POLICY "Users can upload voice samples" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'voice-samples');

CREATE POLICY "Users can read voice samples" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'voice-samples');

CREATE POLICY "Public can read voice samples" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'voice-samples');

-- 5. Index for community voices lookup
CREATE INDEX IF NOT EXISTS idx_community_voices_contributor ON community_voices(contributor_id);
CREATE INDEX IF NOT EXISTS idx_community_voices_uses ON community_voices(uses DESC);

-- 6. Enable RLS on key tables
ALTER TABLE community_voices ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for community_voices
-- Anyone can read community voices (public library)
CREATE POLICY "Anyone can read community voices" ON community_voices
  FOR SELECT USING (true);

-- Users can insert their own voice contribution
CREATE POLICY "Users can insert their own voice" ON community_voices
  FOR INSERT WITH CHECK (auth.uid() = contributor_id);

-- Users can update their own voice
CREATE POLICY "Users can update their own voice" ON community_voices
  FOR UPDATE USING (auth.uid() = contributor_id);

-- Users can delete their own voice
CREATE POLICY "Users can delete their own voice" ON community_voices
  FOR DELETE USING (auth.uid() = contributor_id);

-- 8. RLS Policies for profiles
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- =====================================================
-- Voice data structure in private_voices / public_voices:
-- {
--   "voiceId": "uuid",
--   "name": "Dave's Voice",
--   "audioSampleUrl": "https://xxx.supabase.co/storage/v1/object/public/voice-samples/...",
--   "status": "ready",
--   "createdAt": "2026-04-07T..."
-- }
-- =====================================================
