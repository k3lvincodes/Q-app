-- Get Unused Unique Codes
-- Run these queries in Supabase SQL Editor

-- Option 1: Get all unused codes as JSON array
SELECT json_agg(code) as codes
FROM unique_codes
WHERE used_by IS NULL AND is_active = true;

-- Option 2: Get unused codes with details (code + boots reward) as JSON
SELECT json_agg(
  json_build_object(
    'code', code,
    'boots_reward', boots_reward
  )
) as codes
FROM unique_codes
WHERE used_by IS NULL AND is_active = true;

-- Option 3: Simple list of unused codes (one per row for easy copy/paste)
SELECT code 
FROM unique_codes 
WHERE used_by IS NULL AND is_active = true
ORDER BY created_at;

-- Option 4: Count of unused vs used codes
SELECT 
  COUNT(*) FILTER (WHERE used_by IS NULL) as unused_codes,
  COUNT(*) FILTER (WHERE used_by IS NOT NULL) as used_codes,
  COUNT(*) as total_codes
FROM unique_codes
WHERE is_active = true;
