-- Run this in Supabase SQL Editor
-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  trial_end TIMESTAMPTZ,
  plan TEXT DEFAULT 'trial',
  chars_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: users can only manage their own profile
DROP POLICY IF EXISTS "Users can manage own profile";
CREATE POLICY "Users can manage own profile" ON profiles
  FOR ALL USING (auth.uid() = id);
