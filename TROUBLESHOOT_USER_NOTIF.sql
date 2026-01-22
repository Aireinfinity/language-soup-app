-- 1. First, let's find the user and their token.
-- Replace 'USER_IDENTIFIER' with their username, display_name, or ID.
-- If you suspect it's a specific user, you can put their name/email here.

SELECT 
    u.id, 
    u.display_name, 
    u.username,
    t.expo_push_token, 
    t.platform,
    t.updated_at as token_last_updated,
    gm.group_id,
    g.name as group_name
FROM users u
LEFT JOIN app_push_tokens t ON u.id = t.user_id
LEFT JOIN app_group_members gm ON u.id = gm.user_id
LEFT JOIN app_groups g ON gm.group_id = g.id
WHERE u.display_name ILIKE '%USER_IDENTIFIER%' 
   OR u.username ILIKE '%USER_IDENTIFIER%'
   OR u.email ILIKE '%USER_IDENTIFIER%';
