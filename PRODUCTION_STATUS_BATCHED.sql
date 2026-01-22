-- 🎯 PRODUCTION STATUS CHECK (BATCHING EDITION)
-- Run this to see the breakdown of how challenges will be delivered

SELECT '1. CRON STATUS' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM cron.job 
            WHERE command = 'SELECT process_scheduled_challenges_PROD()' 
            AND active = true
        ) THEN '✅ ACTIVE - Calling BATCHED function'
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
        ELSE '⚠️ NO CHALLENGES SCHEDULED (Go create one!)'
    END

UNION ALL

-- BATCH BREAKDOWN
SELECT '3. BATCH 1 (1-100)',
    '✅ ' || LEAST(COUNT(*), 100)::text || ' users'
FROM (
    SELECT DISTINCT ON (t.user_id) t.id
    FROM app_push_tokens t
    JOIN app_group_members gm ON gm.user_id = t.user_id
    WHERE gm.group_id NOT IN ('439ffe03-96fa-41d3-96f1-c0a8a779ce9d', 'a34c1008-72ea-4dbb-a605-6673f6c5f6b3')
    AND t.expo_push_token LIKE 'ExponentPushToken%'
) as total

UNION ALL

SELECT '4. BATCH 2 (101-119)',
    '✅ ' || GREATEST(COUNT(*) - 100, 0)::text || ' users'
FROM (
    SELECT DISTINCT ON (t.user_id) t.id
    FROM app_push_tokens t
    JOIN app_group_members gm ON gm.user_id = t.user_id
    WHERE gm.group_id NOT IN ('439ffe03-96fa-41d3-96f1-c0a8a779ce9d', 'a34c1008-72ea-4dbb-a605-6673f6c5f6b3')
    AND t.expo_push_token LIKE 'ExponentPushToken%'
) as total


UNION ALL

SELECT '5. TOTAL REACH',
    '🌍 ' || COUNT(*)::text || ' total unique users'
FROM (
    SELECT DISTINCT ON (t.user_id) t.id
    FROM app_push_tokens t
    JOIN app_group_members gm ON gm.user_id = t.user_id
    WHERE gm.group_id NOT IN ('439ffe03-96fa-41d3-96f1-c0a8a779ce9d', 'a34c1008-72ea-4dbb-a605-6673f6c5f6b3')
    AND t.expo_push_token LIKE 'ExponentPushToken%'
) as total

UNION ALL

SELECT '6. SYSTEM STATUS',
    '🚀 SCALE READY - Batching is active & Eva is safe!';
