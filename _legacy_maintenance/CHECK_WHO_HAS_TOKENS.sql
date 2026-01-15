-- CHECK WHO ACTUALLY HAS TOKENS
SELECT u.id, u.email, t.expo_push_token
FROM auth.users u
JOIN app_push_tokens t ON u.id = t.user_id
WHERE t.expo_push_token LIKE 'ExponentPushToken%'
LIMIT 5;
