-- Private voice profiles table
CREATE TABLE IF NOT EXISTS private_voices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  accent TEXT,
  pitch TEXT,
  describe1 TEXT,
  describe2 TEXT,
  audio_url TEXT NOT NULL,
  uses INTEGER DEFAULT 0,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE private_voices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own private voices" ON private_voices
  FOR ALL USING (auth.uid() = user_id);
