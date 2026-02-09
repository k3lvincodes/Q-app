-- Generate 200 Unique Codes for Onboarding
-- Format: Q-WEL-{3 letters}-{4 digit number}-{1 letter}
-- Each code awards 300 boots

-- Generate codes using a series approach
DO $$
DECLARE
  i INTEGER;
  letters1 TEXT;
  letters2 TEXT;
  num TEXT;
  letter3 TEXT;
  new_code TEXT;
  alphabet TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
BEGIN
  FOR i IN 1..200 LOOP
    -- Generate 3 random capital letters
    letters1 := substr(alphabet, floor(random() * 26 + 1)::int, 1) ||
                substr(alphabet, floor(random() * 26 + 1)::int, 1) ||
                substr(alphabet, floor(random() * 26 + 1)::int, 1);
    
    -- Generate 4-digit number (padded with zeros)
    num := lpad(i::text, 4, '0');
    
    -- Generate 1 random capital letter
    letter3 := substr(alphabet, floor(random() * 26 + 1)::int, 1);
    
    -- Build the code
    new_code := 'Q-WEL-' || letters1 || '-' || num || '-' || letter3;
    
    -- Insert if not exists
    INSERT INTO unique_codes (code, boots_reward, is_active)
    VALUES (new_code, 300, true)
    ON CONFLICT (code) DO NOTHING;
  END LOOP;
END $$;

-- Verify the codes were created
SELECT COUNT(*) as total_codes FROM unique_codes WHERE boots_reward = 300;
