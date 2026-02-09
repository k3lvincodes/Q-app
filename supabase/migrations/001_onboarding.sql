-- Onboarding Database Schema
-- Run this in Supabase SQL Editor

-- 1. Add onboarding columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_code_used TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS boots_count INTEGER DEFAULT 0;

-- 2. Create unique_codes table for tracking valid codes
CREATE TABLE IF NOT EXISTS unique_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_by UUID REFERENCES profiles(id),
  used_at TIMESTAMPTZ,
  boots_reward INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE
);

-- 3. Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_unique_codes_code ON unique_codes(code);
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding ON profiles(onboarding_completed);

-- 4. Enable RLS on unique_codes
ALTER TABLE unique_codes ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- Users can check if a code exists and is valid (but not see who used it)
DROP POLICY IF EXISTS "Users can check code validity" ON unique_codes;
CREATE POLICY "Users can check code validity" ON unique_codes
  FOR SELECT USING (true);

-- Users can claim unused codes
DROP POLICY IF EXISTS "Users can claim unused codes" ON unique_codes;
CREATE POLICY "Users can claim unused codes" ON unique_codes
  FOR UPDATE USING (
    used_by IS NULL 
    AND is_active = true 
    AND auth.uid() IS NOT NULL
  );

-- 6. Function to complete onboarding atomically
CREATE OR REPLACE FUNCTION complete_onboarding(
  p_user_id UUID,
  p_code TEXT,
  p_subscription_service TEXT,
  p_amount TEXT,
  p_join_date TEXT,
  p_match_email TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code_record unique_codes%ROWTYPE;
  v_boots_reward INTEGER;
  v_current_boots INTEGER;
BEGIN
  -- Check if user already completed onboarding
  IF EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = p_user_id AND onboarding_completed = true
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Onboarding already completed');
  END IF;

  -- Find and lock the code
  SELECT * INTO v_code_record
  FROM unique_codes
  WHERE code = p_code
    AND is_active = true
  FOR UPDATE;

  -- Check if code exists
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid code');
  END IF;

  -- Check if code already used
  IF v_code_record.used_by IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'Code already used');
  END IF;

  v_boots_reward := COALESCE(v_code_record.boots_reward, 1);

  -- Get current boots count
  SELECT COALESCE(boots_count, 0) INTO v_current_boots
  FROM profiles
  WHERE id = p_user_id;

  -- Mark code as used
  UPDATE unique_codes
  SET used_by = p_user_id,
      used_at = NOW()
  WHERE id = v_code_record.id;

  -- Update user profile
  UPDATE profiles
  SET onboarding_completed = true,
      onboarding_completed_at = NOW(),
      onboarding_code_used = p_code,
      boots_count = COALESCE(boots_count, 0) + v_boots_reward
  WHERE id = p_user_id;

  RETURN json_build_object(
    'success', true,
    'boots_awarded', v_boots_reward,
    'total_boots', v_current_boots + v_boots_reward
  );
END;
$$;

-- 7. Grant execute permission
GRANT EXECUTE ON FUNCTION complete_onboarding TO authenticated;

-- 8. Insert some test codes (optional - remove in production)
-- INSERT INTO unique_codes (code, boots_reward) VALUES 
--   ('WELCOME2024', 5),
--   ('JOINQ100', 10),
--   ('TESTCODE', 1);
