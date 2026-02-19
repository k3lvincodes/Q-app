-- Fix recalculate_balance to handle all transaction types
-- including deposit_credit, gift_credit, cash_spend, purchase
-- and correctly use total vs amount for old-style transactions (where total = 0)

CREATE OR REPLACE FUNCTION public.recalculate_balance(user_uuid uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  r RECORD;
  v_balance NUMERIC := 0;
  v_earnings NUMERIC := 0;
  v_amount NUMERIC;
BEGIN
  FOR r IN 
    SELECT * 
    FROM transactions 
    WHERE user_id = user_uuid 
    ORDER BY created_at ASC
  LOOP
    -- Use total if > 0, otherwise fall back to amount (for old-style transactions)
    v_amount := CASE WHEN COALESCE(r.total, 0) > 0 THEN r.total ELSE r.amount END;

    -- 1. Balance calculation
    IF r.type IN ('credit', 'deposit', 'refund', 'earning', 'deposit_credit', 'gift_credit') THEN
      v_balance := v_balance + v_amount;
    ELSIF r.type IN ('debit', 'withdrawal', 'payment', 'cash_spend', 'purchase') THEN
      v_balance := v_balance - v_amount + COALESCE(r.boots_used, 0);
    END IF;

    -- 2. Earnings: deposits do NOT count as earnings
    IF (r.type = 'credit' OR r.type = 'earning' OR r.type = 'gift_credit') 
       AND (r.description IS NULL OR NOT r.description ILIKE 'deposit%') THEN
      v_earnings := v_earnings + v_amount;
    END IF;

    -- 3. Earnings can never exceed balance (spend deposits first)
    v_earnings := GREATEST(0, LEAST(v_earnings, v_balance));
  END LOOP;

  UPDATE profiles
  SET 
    balance = v_balance,
    earnings_balance = v_earnings
  WHERE id = user_uuid;
END;
$$;
