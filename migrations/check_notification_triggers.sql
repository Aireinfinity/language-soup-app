-- Check if the challenge notification trigger exists
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_name LIKE '%challenge%' OR trigger_name LIKE '%notification%';
