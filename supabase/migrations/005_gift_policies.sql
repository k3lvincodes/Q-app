-- 1. Allow users to insert their own gifts
CREATE POLICY "Senders can insert their own gifts" ON gifts
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- 2. Secure function to claim a gift
CREATE OR REPLACE FUNCTION claim_gift(
  p_gift_code TEXT,
  p_password TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_gift_record gifts%ROWTYPE;
  v_user_id UUID;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User must be logged in');
  END IF;

  -- Find the gift
  SELECT * INTO v_gift_record
  FROM gifts
  WHERE gift_code = p_gift_code;

  -- Validation
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Gift not found');
  END IF;

  IF v_gift_record.status = 'claimed' THEN
    RETURN json_build_object('success', false, 'error', 'Gift already claimed');
  END IF;

  IF v_gift_record.status = 'expired' THEN
    RETURN json_build_object('success', false, 'error', 'Gift expired');
  END IF;

  -- Verify password
  -- Note: In a real production app, passwords should be hashed. 
  -- Since the user asked for a simple "Unlock password" for the gift, direct comparison is used here.
  IF v_gift_record.unlock_password <> p_password THEN
     RETURN json_build_object('success', false, 'error', 'Incorrect password');
  END IF;

  -- Claim the gift
  UPDATE gifts
  SET status = 'claimed',
      recipient_id = v_user_id,
      claimed_at = NOW()
  WHERE id = v_gift_record.id
  RETURNING * INTO v_gift_record;

  RETURN json_build_object(
    'success', true,
    'message', 'Gift claimed successfully',
    'amount', v_gift_record.amount,
    'currency', v_gift_record.currency,
    'id', v_gift_record.id
  );
END;
$$;

-- 3. Grant execute permission
GRANT EXECUTE ON FUNCTION claim_gift TO authenticated;
