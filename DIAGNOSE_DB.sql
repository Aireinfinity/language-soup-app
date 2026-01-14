-- DIAGNOSE_DB.sql
-- Run this to reveal the exact state of your database.

-- 1. CHECK TRIGGER (Is the "Printer" installed?)
SELECT trigger_name, action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'app_challenges';

-- 2. CHECK FUNCTION (Is the "Printer Code" there?)
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'handle_new_challenge';

-- 3. CHECK CRON LOGIC (How does the "Address List" look?)
SELECT prosrc 
FROM pg_proc 
WHERE proname = 'send_due_challenges';
