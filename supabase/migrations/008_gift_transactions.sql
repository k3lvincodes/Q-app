-- Add fee and total_amount to gifts table
ALTER TABLE gifts ADD COLUMN IF NOT EXISTS fee NUMERIC DEFAULT 0 NOT NULL;
ALTER TABLE gifts ADD COLUMN IF NOT EXISTS total_amount NUMERIC DEFAULT 0 NOT NULL;

-- Safe check for balance constraint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_balance_check') THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_balance_check CHECK (balance >= 0);
  END IF;
END $$;

-- Create trigger to deduct balance (create transaction)
CREATE OR REPLACE FUNCTION on_gift_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO transactions (user_id, amount, type, description, created_at)
  VALUES (NEW.sender_id, NEW.total_amount, 'debit', 'Gift sent', NOW());
  
  -- Also update the user's profile balance
  UPDATE profiles
  SET balance = balance - NEW.total_amount
  WHERE id = NEW.sender_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_gift_transaction ON gifts;
CREATE TRIGGER trigger_gift_transaction
AFTER INSERT ON gifts
FOR EACH ROW
EXECUTE FUNCTION on_gift_created();
