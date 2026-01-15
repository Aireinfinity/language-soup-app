SELECT 
    event_object_table as table_name,
    trigger_name,
    event_manipulation as event,
    action_timing as timing,
    action_statement as statement
FROM information_schema.triggers
WHERE event_object_table = 'app_challenges'
ORDER BY event_object_table, trigger_name;
