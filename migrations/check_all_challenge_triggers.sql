-- Check if there's a database trigger that should be sending notifications
-- but might be broken

SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing,
    action_orientation
FROM information_schema.triggers
WHERE event_object_table = 'app_challenges'
ORDER BY trigger_name;
