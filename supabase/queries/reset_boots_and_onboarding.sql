-- Reset unique_codes table
UPDATE unique_codes
SET used_by = NULL,
    used_at = NULL;

-- Reset profiles table
UPDATE profiles
SET onboarding_completed = FALSE,
    onboarding_completed_at = NULL,
    onboarding_code_used = NULL,
    boots_count = 0;

-- Optional: Verify the reset
-- SELECT * FROM unique_codes WHERE used_by IS NOT NULL;
-- SELECT * FROM profiles WHERE onboarding_completed = TRUE;
