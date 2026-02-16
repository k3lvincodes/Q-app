-- Create gifts table
CREATE TABLE IF NOT EXISTS gifts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES auth.users(id) NOT NULL,
  recipient_email TEXT, -- Optional, for email based gifts
  recipient_id UUID REFERENCES auth.users(id), -- Optional, filled when claimed or if sending to known user
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'NGN' NOT NULL,
  message TEXT NOT NULL,
  gift_code TEXT UNIQUE NOT NULL,
  unlock_password TEXT NOT NULL,
  status TEXT CHECK (status IN ('sent', 'claimed', 'expired')) DEFAULT 'sent' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  claimed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE gifts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Senders can view their sent gifts" ON gifts
  FOR SELECT USING (auth.uid() = sender_id);

CREATE POLICY "Recipients can view their received gifts" ON gifts
  FOR SELECT USING (auth.uid() = recipient_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_gifts_sender_id ON gifts(sender_id);
CREATE INDEX IF NOT EXISTS idx_gifts_recipient_id ON gifts(recipient_id);
CREATE INDEX IF NOT EXISTS idx_gifts_gift_code ON gifts(gift_code);
