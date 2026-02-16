-- 1. Enable pgcrypto extension for hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Make unlock_password optional
ALTER TABLE gifts ALTER COLUMN unlock_password DROP NOT NULL;

-- 3. Create a trigger to hash the password on INSERT
CREATE OR REPLACE FUNCTION hash_gift_password()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.unlock_password IS NOT NULL AND NEW.unlock_password <> '' THEN
    NEW.unlock_password := crypt(NEW.unlock_password, gen_salt('bf'));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_hash_gift_password
BEFORE INSERT ON gifts
FOR EACH ROW
EXECUTE FUNCTION hash_gift_password();

-- 4. Update the claim_gift function to verify hashed password (or allow if null)
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

  RETURN json_build_object(
    'success', true,
    'message', 'Gift claimed successfully',
    'amount', v_gift_record.amount,
    'currency', v_gift_record.currency,
    'id', v_gift_record.id
  );
END;
$$;
