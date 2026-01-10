-- Show all users that will be COUNTED (not filtered out)
-- These are the real users (excluding noah, bots, system accounts)

SELECT id, display_name, created_at
FROM app_users
WHERE LOWER(display_name) NOT LIKE '%noah%'
  AND LOWER(display_name) NOT LIKE '%bot%'
  AND LOWER(display_name) NOT LIKE '%system%'
ORDER BY created_at DESC;

-- Show all users that will be FILTERED OUT
-- These are the test/system accounts

SELECT id, display_name, created_at
FROM app_users
WHERE LOWER(display_name) LIKE '%noah%'
   OR LOWER(display_name) LIKE '%bot%'
   OR LOWER(display_name) LIKE '%system%'
ORDER BY created_at DESC;

-- Summary counts
SELECT 
  COUNT(*) FILTER (WHERE LOWER(display_name) NOT LIKE '%noah%' 
                    AND LOWER(display_name) NOT LIKE '%bot%' 
                    AND LOWER(display_name) NOT LIKE '%system%') as real_users,
  COUNT(*) FILTER (WHERE LOWER(display_name) LIKE '%noah%' 
                    OR LOWER(display_name) LIKE '%bot%' 
                    OR LOWER(display_name) LIKE '%system%') as filtered_out,
  COUNT(*) as total_users
FROM app_users;
