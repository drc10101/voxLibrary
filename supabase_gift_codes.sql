-- Gift codes table
CREATE TABLE IF NOT EXISTS gift_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  plan TEXT NOT NULL,
  characters INTEGER DEFAULT 0,
  months INTEGER DEFAULT 1,
  price_paid REAL DEFAULT 0,
  purchaser_id UUID REFERENCES auth.users(id),
  purchaser_email TEXT,
  recipient_email TEXT,
  recipient_name TEXT,
  redeemed_by UUID REFERENCES auth.users(id),
  redeemed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE gift_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can use gift codes" ON gift_codes
  FOR UPDATE USING (true) WITH CHECK (true);
