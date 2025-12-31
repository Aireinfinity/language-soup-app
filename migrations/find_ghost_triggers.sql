-- FIND GHOST TRIGGERS 👻
-- Run this in your Supabase SQL Editor to see what triggers are hiding!

SELECT 
    event_object_schema as schema_name,
    event_object_table as table_name,
    trigger_name,
    action_timing,
    event_manipulation as event
FROM information_schema.triggers
WHERE event_object_table = 'users' 
AND event_object_schema = 'auth';

-- If you see 'handle_new_user' or 'on_auth_user_created' (other than the promo one),
-- THAT IS THE CULPRIT! 
