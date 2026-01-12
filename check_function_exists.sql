-- Check if the function exists in the database
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines
WHERE routine_name = 'auto_send_approved_challenges'
  AND routine_schema = 'public';

-- If the above returns empty, the function doesn't exist and needs to be created
