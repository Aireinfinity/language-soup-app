-- 1. Check for ANY other tokens for Eva
SELECT user_id, expo_push_token, platform, updated_at
FROM app_push_tokens
WHERE user_id = '26d90cc6-2d3e-43ca-bf71-60f51dbf3e44'
ORDER BY updated_at DESC;

-- 2. Check how many TOTAL tokens we are trying to send to in PROD
SELECT COUNT(*) 
FROM (
    SELECT DISTINCT ON (t.user_id) t.id
    FROM app_push_tokens t
    JOIN app_group_members gm ON gm.user_id = t.user_id
    WHERE gm.group_id NOT IN ('439ffe03-96fa-41d3-96f1-c0a8a779ce9d', 'a34c1008-72ea-4dbb-a605-6673f6c5f6b3')
    AND t.expo_push_token LIKE 'ExponentPushToken%'
) as total_notifiable_tokens;
