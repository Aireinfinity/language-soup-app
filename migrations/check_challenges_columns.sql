-- Check the structure of app_challenges table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'app_challenges'
ORDER BY ordinal_position;
