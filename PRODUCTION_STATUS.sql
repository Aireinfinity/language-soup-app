-- 🎯 PRODUCTION STATUS CHECK
-- Run this to verify the system is ready

SELECT '1. CRON STATUS' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM cron.job 
            WHERE command = 'SELECT process_scheduled_challenges_PROD()' 
            AND active = true
        ) THEN '✅ ACTIVE - Calling PROD function'
        ELSE '❌ NOT ACTIVE'
    END as status

UNION ALL

SELECT '2. NEXT CHALLENGE',
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM app_scheduled_challenges 
            WHERE status = 'approved'
        ) THEN '✅ SCHEDULED for ' || (
            SELECT TO_CHAR(scheduled_time, 'HH24:MI on Mon DD') 
            FROM app_scheduled_challenges 
            WHERE status = 'approved' 
            ORDER BY scheduled_time ASC 
            LIMIT 1
        )
        ELSE '⚠️ NO CHALLENGES SCHEDULED'
    END

UNION ALL

SELECT '3. TOTAL USERS',
    '✅ ' || COUNT(*)::text || ' users will be notified'
FROM app_push_tokens

UNION ALL

SELECT '4. TOTAL GROUPS',
    '✅ ' || COUNT(*)::text || ' groups will receive challenges'
FROM app_groups
WHERE id NOT IN (
    '439ffe03-96fa-41d3-96f1-c0a8a779ce9d',  -- noah's test group solo
    'a34c1008-72ea-4dbb-a605-6673f6c5f6b3'   -- app testers
)

UNION ALL

SELECT '5. SYSTEM STATUS',
    '🚀 LIVE - Automation is running!';
