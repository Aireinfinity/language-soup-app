-- 🔎 Check Johnny's exact position
WITH all_tokens AS (
    SELECT 
        u.display_name,
        ROW_NUMBER() OVER (ORDER BY t.updated_at DESC) as position
    FROM app_push_tokens t
    JOIN app_users u ON t.user_id = u.id
    WHERE t.expo_push_token LIKE 'ExponentPushToken%'
    AND u.id IN (
        SELECT user_id FROM app_group_members 
        WHERE group_id NOT IN ('439ffe03-96fa-41d3-96f1-c0a8a779ce9d', 'a34c1008-72ea-4dbb-a605-6673f6c5f6b3')
    )
)
SELECT position, display_name
FROM all_tokens
WHERE display_name ILIKE '%Johnny%' OR display_name ILIKE '%Johnny%';
