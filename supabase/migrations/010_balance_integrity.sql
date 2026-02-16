-- 1. Create the Trigger Function
CREATE OR REPLACE FUNCTION sync_balance_from_transaction()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle INSERT
    IF (TG_OP = 'INSERT') THEN
        IF NEW.type = 'credit' THEN
            UPDATE profiles SET balance = balance + NEW.amount WHERE id = NEW.user_id;
        ELSIF NEW.type = 'debit' THEN
            UPDATE profiles SET balance = balance - NEW.amount WHERE id = NEW.user_id;
        END IF;
        RETURN NEW;
    
    -- Handle DELETE (Revert the action)
    ELSIF (TG_OP = 'DELETE') THEN
        IF OLD.type = 'credit' THEN
            UPDATE profiles SET balance = balance - OLD.amount WHERE id = OLD.user_id;
        ELSIF OLD.type = 'debit' THEN
            UPDATE profiles SET balance = balance + OLD.amount WHERE id = OLD.user_id;
        END IF;
        RETURN OLD;

    -- Handle UPDATE (Revert OLD, Apply NEW)
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Revert OLD
        IF OLD.type = 'credit' THEN
            UPDATE profiles SET balance = balance - OLD.amount WHERE id = OLD.user_id;
        ELSIF OLD.type = 'debit' THEN
            UPDATE profiles SET balance = balance + OLD.amount WHERE id = OLD.user_id;
        END IF;

        -- Apply NEW
        IF NEW.type = 'credit' THEN
            UPDATE profiles SET balance = balance + NEW.amount WHERE id = NEW.user_id;
        ELSIF NEW.type = 'debit' THEN
            UPDATE profiles SET balance = balance - NEW.amount WHERE id = NEW.user_id;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the Trigger
DROP TRIGGER IF EXISTS trigger_sync_balance ON transactions;
CREATE TRIGGER trigger_sync_balance
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW
EXECUTE FUNCTION sync_balance_from_transaction();


-- 3. Refactor on_gift_created to REMOVE direct balance update
CREATE OR REPLACE FUNCTION on_gift_created()
RETURNS TRIGGER AS $$
BEGIN
  -- We ONLY insert the transaction now. The trigger above will handle the balance update.
  INSERT INTO transactions (user_id, amount, type, description, created_at)
  VALUES (NEW.sender_id, NEW.total_amount, 'debit', 'Gift sent', NOW());
  
  -- REMOVED: UPDATE profiles SET balance = balance - NEW.total_amount ...
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. Refactor claim_gift to REMOVE direct balance update
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

  -- Credit Earnings Balance (This is separate logic, unrelated to transaction Ledger)
  UPDATE profiles
  SET earnings_balance = earnings_balance + v_gift_record.amount
  WHERE id = v_user_id;

  -- Create a transaction record for the credit
  -- The trigger `trigger_sync_balance` will automatically update `profiles.balance`
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
