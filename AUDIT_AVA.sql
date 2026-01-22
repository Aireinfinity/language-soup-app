-- 1. Check if Ava has MULTIPLE tokens (maybe we are picking an old one)
SELECT 
    user_id, 
    expo_push_token, 
    platform, 
    updated_at,
    created_at
FROM app_push_tokens 
WHERE user_id = '26d90cc6-2d3e-43ca-bf71-60f51dbf3e44'
ORDER BY updated_at DESC;

-- 2. Check if anyone ELSE got a notification recently
-- (We use the internal net extensions logs if possible)
-- Or we check the app_challenges table to see if her groups actually got the challenge
SELECT 
    g.name as group_name,
    c.prompt_text,
    c.created_at
FROM app_challenges c
JOIN app_groups g ON c.group_id = g.id
JOIN app_group_members gm ON gm.group_id = g.id
WHERE gm.user_id = '26d90cc6-2d3e-43ca-bf71-60f51dbf3e44'
AND c.created_at > NOW() - interval '24 hours'
ORDER BY c.created_at DESC;
