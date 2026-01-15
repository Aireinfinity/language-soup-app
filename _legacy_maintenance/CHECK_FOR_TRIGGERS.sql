-- CHECK FOR TRIGGERS
-- Is there a hidden trigger sending notifications automatically?

SELECT 
    event_object_table as table_name, 
    trigger_name, 
    action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'app_challenges';
