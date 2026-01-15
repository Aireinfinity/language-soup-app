-- RUN THIS AFTER RUNNING FINAL_ADJUSTED_FIX.sql
-- It should return "TRUE" for the trigger and show the new source code for the function.

-- 1. CHECK FOR TRIGGER (Should be present)
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table, 
    action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'app_challenges' 
AND trigger_name = 'on_challenge_created';

-- 2. CHECK FUNCTION LOGIC (Should see "notifications sent" but "insert" only for "NOT ILIKE %test%")
SELECT prosrc 
FROM pg_proc 
WHERE proname = 'send_due_challenges';
