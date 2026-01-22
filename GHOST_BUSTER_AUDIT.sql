-- 👻 GHOST BUSTER AUDIT
-- Listing the 55 users currently excluded from notifications

SELECT 
    u.display_name,
    u.id as user_id,
    CASE 
        WHEN NOT EXISTS (SELECT 1 FROM app_group_members gm WHERE gm.user_id = u.id) 
            THEN '🌑 No Groups Joined (Lurking in Lobby)'
        WHEN NOT EXISTS (
            SELECT 1 FROM app_group_members gm 
            WHERE gm.user_id = u.id 
            AND gm.group_id NOT IN ('439ffe03-96fa-41d3-96f1-c0a8a779ce9d', 'a34c1008-72ea-4dbb-a605-6673f6c5f6b3')
        ) THEN '🧪 Only in Test Groups'
        WHEN t.expo_push_token NOT LIKE 'ExponentPushToken%' 
            THEN '🚫 Invalid Token Format'
        ELSE '🌀 Shadow Ghost (Duplicate Token Row)'
    END as ghost_reason,
    t.expo_push_token,
    t.updated_at as last_seen
FROM app_push_tokens t
JOIN app_users u ON t.user_id = u.id
-- Filter for anyone NOT in the final success pool
WHERE t.id NOT IN (
    SELECT t2.id
    FROM (
        SELECT DISTINCT ON (user_id) id
        FROM app_push_tokens
        WHERE expo_push_token LIKE 'ExponentPushToken%'
        ORDER BY user_id, updated_at DESC
    ) t2
    JOIN app_group_members gm ON gm.user_id = (SELECT user_id FROM app_push_tokens WHERE id = t2.id)
    WHERE gm.group_id NOT IN ('439ffe03-96fa-41d3-96f1-c0a8a779ce9d', 'a34c1008-72ea-4dbb-a605-6673f6c5f6b3')
)
ORDER BY ghost_reason, display_name;
