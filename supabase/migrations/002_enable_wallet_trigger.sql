-- Enable the wallet application trigger on transactions table
-- This ensures that balance updates happen automatically on transaction insert

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_apply_wallet') THEN
        CREATE TRIGGER trg_apply_wallet
        AFTER INSERT ON public.transactions
        FOR EACH ROW
        EXECUTE FUNCTION public.apply_wallet_on_transaction();
    END IF;
END $$;
