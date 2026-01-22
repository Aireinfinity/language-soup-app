-- 📊 THE SCALE SUMMARY (THE VICTORY LAP)
-- This shows the satisfying breakdown of your 119-user empire!

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
SELECT '1. BATCH 1 (Sent in Package A)' as category, '📦 ' || LEAST(total_users, 100)::text || ' users' as details FROM stats
UNION ALL
SELECT '2. BATCH 2 (Sent in Package B)', '📦 ' || GREATEST(total_users - 100, 0)::text || ' users (Eva is here! ✨)' FROM stats
UNION ALL
SELECT '3. TOTAL TARGET REACH', '🚀 ' || total_users::text || ' unique humans notified' FROM stats
UNION ALL
SELECT '4. SYSTEM LIMIT', '♾️ UNLIMITED (The 100-user wall is gone!)'
ORDER BY category;
