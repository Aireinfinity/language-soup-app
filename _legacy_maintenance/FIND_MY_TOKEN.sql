-- FIND YOUR TOKEN
-- Let's find your token by looking at recent entries or your email
SELECT user_id, expo_push_token, created_at
FROM app_push_tokens
ORDER BY created_at DESC
LIMIT 10;
