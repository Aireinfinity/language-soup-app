-- Check what triggers are currently active on app_challenges
SELECT 
    trigger_name,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'app_challenges'
ORDER BY trigger_name;
