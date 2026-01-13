-- VERIFY PRODUCTION READINESS 🟢
-- The Ultimate "Go / No-Go" Checklist.

WITH 
    -- 1. Check if the "Double Dip" Trigger is dead
    trigger_check AS (
        SELECT count(*) as cnt 
        FROM information_schema.triggers 
        WHERE event_object_table = 'app_challenges'
        AND trigger_name = 'on_challenge_created_send_notification'
    ),
    -- 2. Check if the Cron Job has the "Exclusions" logic (Production Version)
    cron_logic_check AS (
        SELECT CASE 
            WHEN pg_get_functiondef('process_scheduled_challenges_safe'::regproc) ILIKE '%NOT IN%' THEN 1
            ELSE 0
        END as has_exclusions
    ),
    -- 3. Check if there is a challenge waiting for tomorrow
    queue_check AS (
        SELECT count(*) as cnt
        FROM app_scheduled_challenges
        WHERE status = 'approved' AND scheduled_time > NOW()
    ),
    -- 4. Check if Tokens are clean (Global Max = 1)
    token_check AS (
        SELECT max(token_count) as max_tokens
        FROM (SELECT count(*) as token_count FROM app_push_tokens GROUP BY user_id) sub
    )

SELECT 
    CASE WHEN t.cnt = 0 THEN '✅ PASS' ELSE '❌ FAIL (Trigger Active)' END as "1_Trigger_Dead",
    CASE WHEN c.has_exclusions = 1 THEN '✅ PASS' ELSE '❌ FAIL (Cron Logic Missing Exclusions)' END as "2_Cron_Updated",
    CASE WHEN q.cnt > 0 THEN '✅ PASS' ELSE '❌ FAIL (Queue Empty)' END as "3_Queue_Ready",
    CASE 
        WHEN k.max_tokens = 1 THEN '✅ PASS' 
        WHEN k.max_tokens IS NULL THEN '✅ PASS (No Tokens)'
        ELSE '❌ FAIL (Max Tokens: ' || k.max_tokens || ')' 
    END as "4_Tokens_Clean"
FROM trigger_check t, cron_logic_check c, queue_check q, token_check k;
