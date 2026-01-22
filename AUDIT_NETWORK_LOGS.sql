-- 1. Check if ANY user-level duplicate exists for this token
-- (Maybe her token is linked to an old/deleted account?)
SELECT user_id, expo_push_token, updated_at
FROM app_push_tokens
WHERE expo_push_token = 'ExponentPushToken[owdBpwGlyHJ7E4CiVWeXny]';

-- 2. Verify if Noah actually got the notification today 
-- (This tells us if the 100-limit broke the whole batch)
SELECT status, created_at
FROM app_scheduled_challenges
WHERE scheduled_time >'2026-01-20'
ORDER BY scheduled_time DESC;

-- 3. Check for the actual error in the pg_net logs
-- We'll try to find any recently failed requests to Expo
SELECT 
    id,
    status_code,
    content::jsonb as response_body,
    created_at
FROM net.http_request_queue -- Common in newer Supabase/pg_net
WHERE url LIKE '%exp.host%'
ORDER BY created_at DESC
LIMIT 10;
