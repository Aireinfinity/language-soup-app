SELECT 
    event_object_table as table_name,
    trigger_name,
    event_manipulation as event,
    action_statement as statement
FROM information_schema.triggers
WHERE event_object_table = 'app_messages'
ORDER BY trigger_name;
