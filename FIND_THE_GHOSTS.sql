-- 🔎 THE "WHERE ARE THEY?" AUDIT
-- Finding the exact 25 users missing between the raw list and the notification pool

-- 1. Get the Raw Count of Tokens
SELECT 'Total Rows in app_push_tokens' as metric, COUNT(*) as count FROM app_push_tokens

UNION ALL

-- 2. See how many are excluded because of Group logic
SELECT 'Users with tokens but NOT in any groups', COUNT(*)
FROM app_push_tokens t
LEFT JOIN app_group_members gm ON t.user_id = gm.user_id
WHERE gm.user_id IS NULL

UNION ALL

-- 3. See how many are excluded because they are ONLY in test groups
SELECT 'Users ONLY in excluded test groups', COUNT(DISTINCT t.user_id)
FROM app_push_tokens t
JOIN app_group_members gm ON t.user_id = gm.user_id
WHERE t.user_id NOT IN (
    -- Users who are in at least ONE real group
    SELECT user_id FROM app_group_members
    WHERE group_id NOT IN ('439ffe03-96fa-41d3-96f1-c0a8a779ce9d', 'a34c1008-72ea-4dbb-a605-6673f6c5f6b3')
)

UNION ALL

-- 4. See how many are filtered by the Token Format check
SELECT 'Users with non-Expo tokens (likely invalid)', COUNT(*)
FROM app_push_tokens
WHERE expo_push_token NOT LIKE 'ExponentPushToken%';

-- 5. LIST THE GHOSTS (The first 10 people we are skipping and why)
SELECT 
    u.display_name,
    t.expo_push_token,
    CASE 
        WHEN gm.user_id IS NULL THEN 'No Groups'
        WHEN NOT EXISTS (
            SELECT 1 FROM app_group_members gm2 
            WHERE gm2.user_id = u.id 
            AND gm2.group_id NOT IN ('439ffe03-96fa-41d3-96f1-c0a8a779ce9d', 'a34c1008-72ea-4dbb-a605-6673f6c5f6b3')
        ) THEN 'Only Test Groups'
        WHEN t.expo_push_token NOT LIKE 'ExponentPushToken%' THEN 'Wrong Token Format'
        ELSE 'Should be in'
    END as reason
FROM app_push_tokens t
JOIN app_users u ON t.user_id = u.id
LEFT JOIN app_group_members gm ON t.user_id = gm.user_id
WHERE t.user_id NOT IN (
    -- The final pool logic
    SELECT DISTINCT t2.user_id
    FROM app_push_tokens t2
    JOIN app_group_members gm2 ON gm2.user_id = t2.user_id
    WHERE gm2.group_id NOT IN ('439ffe03-96fa-41d3-96f1-c0a8a779ce9d', 'a34c1008-72ea-4dbb-a605-6673f6c5f6b3')
    AND t2.expo_push_token LIKE 'ExponentPushToken%'
)
LIMIT 10;
