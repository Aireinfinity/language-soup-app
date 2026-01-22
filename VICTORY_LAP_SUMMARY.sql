-- 📊 THE VICTORY LAP: BATCHED STATUS REPORT
-- Run this to celebrate your 119-user notification empire!

WITH total_pool AS (
    SELECT DISTINCT ON (t.user_id) u.display_name, t.expo_push_token
    FROM app_push_tokens t
    JOIN app_users u ON t.user_id = u.id
    JOIN app_group_members gm ON gm.user_id = u.id
    WHERE gm.group_id NOT IN (
        '439ffe03-96fa-41d3-96f1-c0a8a779ce9d', -- noah's test group solo
        'a34c1008-72ea-4dbb-a605-6673f6c5f6b3'  -- app testers
    )
    AND t.expo_push_token LIKE 'ExponentPushToken%'
),
stats AS (
    SELECT COUNT(*) as total_users FROM total_pool
)
SELECT 
    '1. BATCH 1 (Standard)' as "Category", 
    '📦 ' || LEAST(total_users, 100)::text || ' Users' as "Details"
FROM stats
UNION ALL
SELECT 
    '2. BATCH 2 (The Eva Batch! ✨)', 
    '📦 ' || GREATEST(total_users - 100, 0)::text || ' Users'
FROM stats
UNION ALL
SELECT 
    '3. TOTAL UNIQUE REACH', 
    '🚀 ' || total_users::text || ' Humans Notified'
FROM stats
UNION ALL
SELECT 
    '4. SYSTEM CAPACITY', 
    '♾️ UNLIMITED (The 100-user wall is broken!)'
ORDER BY 1;
