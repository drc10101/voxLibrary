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
  uses INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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
