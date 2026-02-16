-- Add earnings_balance to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS earnings_balance NUMERIC DEFAULT 0 NOT NULL;

-- Update claim_gift function to handle balance updates
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

  -- Verify password if it exists
  IF v_gift_record.unlock_password IS NOT NULL AND v_gift_record.unlock_password <> '' THEN
     IF p_password IS NULL OR p_password = '' OR v_gift_record.unlock_password <> crypt(p_password, v_gift_record.unlock_password) THEN
        RETURN json_build_object('success', false, 'error', 'Incorrect password');
     END IF;
  END IF;

  -- Claim the gift
  UPDATE gifts
  SET status = 'claimed',
      recipient_id = v_user_id,
      claimed_at = NOW()
  WHERE id = v_gift_record.id
  RETURNING * INTO v_gift_record;

  -- Credit the recipient's balance and earnings_balance
  -- Balance: Total balance excluding boots
  -- Earnings Balance: Funds earned (from gifts, etc.)
  UPDATE profiles
  SET balance = balance + v_gift_record.amount,
      earnings_balance = earnings_balance + v_gift_record.amount
  WHERE id = v_user_id;

  -- Create a transaction record for the credit
  -- Assuming transactions table exists from 008, verify fields: user_id, amount, type, description
  INSERT INTO transactions (user_id, amount, type, description, created_at)
  VALUES (v_user_id, v_gift_record.amount, 'credit', 'Gift claimed', NOW());

  RETURN json_build_object(
    'success', true,
    'message', 'Gift claimed successfully',
    'amount', v_gift_record.amount,
    'currency', v_gift_record.currency,
    'id', v_gift_record.id
  );
END;
$$;
