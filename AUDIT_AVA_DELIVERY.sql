-- 1. Check if ANYONE in Ava's group received a message yesterday/today
-- Replace 'Ava's Group Name' if you know it, or we'll look it up by her ID.
SELECT 
    g.name as group_name,
    m.content as message_preview,
    m.created_at
FROM app_messages m
JOIN app_groups g ON m.group_id = g.id
JOIN app_group_members gm ON gm.group_id = g.id
WHERE gm.user_id = '26d90cc6-2d3e-43ca-bf71-60f51dbf3e44'
AND m.created_at > NOW() - interval '48 hours'
ORDER BY m.created_at DESC;

-- 2. Check for token collisions (Same token, different user_id)
-- If her token is mapped to an old account, we might be sending it to the wrong user_id
SELECT user_id, expo_push_token, updated_at
FROM app_push_tokens
WHERE expo_push_token = 'ExponentPushToken[owdBpwGlyHJ7E4CiVWeXny]';

-- 3. Check for recently added tokens in the same group
SELECT u.display_name, t.expo_push_token, t.updated_at
FROM app_push_tokens t
JOIN users u ON t.user_id = u.id
JOIN app_group_members gm ON gm.user_id = u.id
WHERE gm.group_id IN (
    SELECT group_id FROM app_group_members WHERE user_id = '26d90cc6-2d3e-43ca-bf71-60f51dbf3e44'
)
ORDER BY t.updated_at DESC
LIMIT 10;
