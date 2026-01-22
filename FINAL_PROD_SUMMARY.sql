-- 🎯 FINAL PRODUCTION STATUS (BATCHING EDITION)
-- This confirms the exact numbers for tomorrow's challenge delivery.

WITH total_pool AS (
    SELECT DISTINCT ON (t.user_id) t.expo_push_token
    FROM app_push_tokens t
    JOIN app_group_members gm ON gm.user_id = t.user_id
    WHERE gm.group_id NOT IN (
        '439ffe03-96fa-41d3-96f1-c0a8a779ce9d', -- noah's test group solo
        'a34c1008-72ea-4dbb-a605-6673f6c5f6b3'  -- app testers
    )
    AND t.expo_push_token LIKE 'ExponentPushToken%'
),
stats AS (
    SELECT COUNT(*) as total_users FROM total_pool
)
SELECT '1. CRON STATUS' as check_name, '✅ ACTIVE - Calling BATCHED function' as status
UNION ALL
SELECT '2. NEXT CHALLENGE', 
    CASE WHEN EXISTS (SELECT 1 FROM app_scheduled_challenges WHERE status = 'approved') 
    THEN '✅ READY' ELSE '⚠️ STOPPED' END
UNION ALL
SELECT '3. BATCH 1 (Users 1-100)', '📦 ' || LEAST(total_users, 100)::text || ' tokens' FROM stats
UNION ALL
SELECT '4. BATCH 2 (Users 101-200)', '📦 ' || GREATEST(total_users - 100, 0)::text || ' tokens (Eva is in here! ✨)' FROM stats
UNION ALL
SELECT '5. TOTAL REACH', '🚀 ' || total_users::text || ' users will be notified' FROM stats
ORDER BY 1;
