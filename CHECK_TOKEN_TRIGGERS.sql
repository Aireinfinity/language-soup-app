-- 🔎 CHECK FOR GHOST TRIGGERS
-- See if anything is automatically deleting or changing tokens
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table, 
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'app_push_tokens';
