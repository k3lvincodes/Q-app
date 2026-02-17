

CREATE EXTENSION IF NOT EXISTS pg_graphql WITH SCHEMA graphql;

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

CREATE FUNCTION public.apply_wallet_on_transaction() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
            DECLARE
                v_balance NUMERIC;
                v_earnings NUMERIC;
                v_boots INTEGER;
            BEGIN
                IF NEW.apply_mode != 'db' THEN
                    RETURN NEW;
                END IF;

                SELECT balance, earnings_balance, boots_count
                    INTO v_balance, v_earnings, v_boots
                    FROM profiles
                    WHERE id = NEW.user_id
                    FOR UPDATE;

                CASE NEW.type
                    WHEN 'gift_credit' THEN
                        v_balance := v_balance + NEW.total;
                        v_earnings := v_earnings + NEW.total;

                    WHEN 'deposit_credit' THEN
                        v_balance := v_balance + NEW.total;

                    WHEN 'cash_spend' THEN
                        IF v_balance < NEW.cash_used THEN
                            RAISE EXCEPTION 'Insufficient balance: have %, need %', v_balance, NEW.cash_used;
                        END IF;
                        v_balance := v_balance - NEW.cash_used;
                        v_earnings := LEAST(v_earnings, v_balance);

                    WHEN 'purchase' THEN
                        IF v_boots < NEW.boots_used THEN
                            RAISE EXCEPTION 'Insufficient boots: have %, need %', v_boots, NEW.boots_used;
                        END IF;
                        IF v_balance < NEW.cash_used THEN
                            RAISE EXCEPTION 'Insufficient balance: have %, need %', v_balance, NEW.cash_used;
                        END IF;
                        v_boots := v_boots - NEW.boots_used::INTEGER;
                        v_balance := v_balance - NEW.cash_used;
                        v_earnings := LEAST(v_earnings, v_balance);

                    WHEN 'checkpoint' THEN
                        RETURN NEW;

                    ELSE
                        RAISE EXCEPTION 'Unknown transaction type: %', NEW.type;
                END CASE;

                UPDATE profiles
                    SET balance = v_balance,
                        earnings_balance = v_earnings,
                        boots_count = v_boots
                    WHERE id = NEW.user_id;

                RETURN NEW;
            END;
            $$;

CREATE FUNCTION public.check_funds_before_transaction() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  user_balance NUMERIC;
  user_boots INTEGER;
  cash_required NUMERIC;
BEGIN
  -- Only check for debit-like transactions
  IF NEW.type IN ('debit', 'withdrawal', 'payment') THEN
    
    -- Get current user state
    SELECT balance, boots_count INTO user_balance, user_boots
    FROM profiles WHERE id = NEW.user_id;

    -- Ensure record exists
    IF NOT FOUND THEN
      RAISE EXCEPTION 'User profile not found.';
    END IF;

    -- Clean inputs
    user_balance := COALESCE(user_balance, 0);
    user_boots := COALESCE(user_boots, 0);
    cash_required := NEW.amount - COALESCE(NEW.boots_used, 0);

    -- Check 1: Boots Sufficiency
    IF COALESCE(NEW.boots_used, 0) > user_boots THEN
      RAISE EXCEPTION 'Insufficient boots balance. Available: %, Required: %', user_boots, NEW.boots_used;
    END IF;

    -- Check 2: Cash Sufficiency (Balance + Boots covering the rest)
    -- Logic: We already subtracted boots from amount to get cash_required.
    -- So we just compare cash_required vs user_balance.
    IF cash_required > user_balance THEN
      RAISE EXCEPTION 'Insufficient wallet balance. Required Cash: %, Available: %', cash_required, user_balance;
    END IF;

  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION public.claim_gift(p_gift_code text, p_password text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
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

CREATE FUNCTION public.complete_onboarding(p_user_id uuid, p_code text, p_subscription_service text, p_amount text, p_join_date text, p_match_email text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
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

CREATE FUNCTION public.deduct_boots_on_transaction() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- If the transaction uses boots, deduct them from the user's profile
  IF NEW.boots_used > 0 THEN
    UPDATE profiles
    SET boots_count = boots_count - NEW.boots_used
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
begin
  insert into public.profiles (id, full_name, avatar_url, email)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', new.email);
  return new;
end;
$$;

CREATE FUNCTION public.hash_gift_password() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.unlock_password IS NOT NULL AND NEW.unlock_password <> '' THEN
    NEW.unlock_password := crypt(NEW.unlock_password, gen_salt('bf'));
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.increment_balance(user_id uuid, amount numeric) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  UPDATE profiles
  SET balance = balance + amount
  WHERE id = user_id;
END;
$$;

CREATE FUNCTION public.on_gift_created() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- We ONLY insert the transaction now. The trigger above will handle the balance update.
  INSERT INTO transactions (user_id, amount, type, description, created_at)
  VALUES (NEW.sender_id, NEW.total_amount, 'debit', 'Gift sent', NOW());
  
  -- REMOVED: UPDATE profiles SET balance = balance - NEW.total_amount ...
  
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.recalculate_balance(user_uuid uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  r RECORD;
  v_balance NUMERIC := 0;
  v_earnings NUMERIC := 0;
BEGIN
  -- Iterate through all transactions in chronological order to reconstruct state
  FOR r IN 
    SELECT * 
    FROM transactions 
    WHERE user_id = user_uuid 
    ORDER BY created_at ASC
  LOOP
    -- 1. Update Balance based on transaction type
    IF r.type IN ('credit', 'deposit', 'refund', 'earning') THEN
      v_balance := v_balance + r.amount;
    ELSIF r.type IN ('debit', 'withdrawal', 'payment') THEN
      -- Debits reduce balance. Boots usage effectively reduces the debit amount (refunds the cost).
      v_balance := v_balance - r.amount + COALESCE(r.boots_used, 0);
    END IF;

    -- 2. Update Earnings Accumulation
    -- Only add to earnings if it's a Credit/Earning and NOT a Deposit
    IF (r.type = 'credit' OR r.type = 'earning') AND (r.description IS NULL OR NOT r.description ILIKE 'deposit%') THEN
      v_earnings := v_earnings + r.amount;
    END IF;

    -- 3. Apply "Spend Deposits First" Logic (Clamping)
    -- Your Available Earnings can never exceed your Total Balance.
    v_earnings := GREATEST(0, LEAST(v_earnings, v_balance));
    
  END LOOP;

  -- 4. Final Updates
  UPDATE profiles
  SET 
    balance = v_balance,
    earnings_balance = v_earnings
  WHERE id = user_uuid;
  
END;
$$;

CREATE FUNCTION public.sync_balance_from_transaction() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;

CREATE TABLE public.gifts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sender_id uuid NOT NULL,
    recipient_email text,
    recipient_id uuid,
    amount numeric NOT NULL,
    currency text DEFAULT 'NGN'::text NOT NULL,
    message text NOT NULL,
    gift_code text NOT NULL,
    unlock_password text,
    status text DEFAULT 'sent'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    claimed_at timestamp with time zone,
    unlock_hint text,
    fee numeric DEFAULT 0 NOT NULL,
    total_amount numeric DEFAULT 0 NOT NULL,
    CONSTRAINT gifts_status_check CHECK ((status = ANY (ARRAY['sent'::text, 'claimed'::text, 'expired'::text])))
);

CREATE TABLE public.invites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    inviter_id uuid NOT NULL,
    invitee_id uuid,
    code text NOT NULL,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT invites_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'redeemed'::text])))
);

CREATE TABLE public.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sender_id uuid,
    ticket_id uuid,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    full_name text,
    email text,
    avatar_url text,
    role text DEFAULT 'user'::text,
    created_at timestamp with time zone DEFAULT now(),
    balance numeric DEFAULT 0,
    onboarding_completed boolean DEFAULT false,
    onboarding_completed_at timestamp with time zone,
    onboarding_code_used text,
    boots_count integer DEFAULT 0,
    earnings_balance numeric DEFAULT 0 NOT NULL,
    CONSTRAINT profiles_balance_check CHECK ((balance >= (0)::numeric)),
    CONSTRAINT profiles_boots_check CHECK ((boots_count >= 0))
);

CREATE TABLE public.requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    request_type text,
    details jsonb,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);

CREATE TABLE public.subscription_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    service_id uuid NOT NULL,
    plan_type text NOT NULL,
    members_limit integer,
    price_per_member numeric,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.subscription_services (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    billing_cycle text,
    renewal_day integer,
    credential_login_code text,
    credential_email text,
    image_url text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.support_messages (
    id bigint NOT NULL,
    ticket_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    message text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.support_messages ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.support_messages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE public.support_tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    email text NOT NULL,
    subject text,
    message text NOT NULL,
    status text DEFAULT 'open'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT support_tickets_status_check CHECK ((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'closed'::text])))
);

CREATE TABLE public.transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    amount numeric NOT NULL,
    type text,
    description text,
    related_request_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    boots_used numeric DEFAULT 0,
    cash_used numeric DEFAULT 0,
    total numeric DEFAULT 0,
    apply_mode text DEFAULT 'none'::text NOT NULL,
    idempotency_key text,
    CONSTRAINT transactions_type_check CHECK ((type = ANY (ARRAY['credit'::text, 'debit'::text, 'payout'::text, 'gift_credit'::text, 'deposit_credit'::text, 'cash_spend'::text, 'purchase'::text, 'checkpoint'::text])))
);

CREATE TABLE public.unique_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    used_by uuid,
    used_at timestamp with time zone,
    boots_reward integer DEFAULT 1,
    is_active boolean DEFAULT true
);

CREATE TABLE public.user_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    service_id uuid NOT NULL,
    status text,
    start_date timestamp with time zone DEFAULT now() NOT NULL,
    renewal_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    plan_id uuid,
    CONSTRAINT user_subscriptions_status_check CHECK ((status = ANY (ARRAY['active'::text, 'cancelled'::text, 'pending'::text])))
);
