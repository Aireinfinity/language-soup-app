-- 🔎 FIND USERS WITH MULTIPLE TOKENS
-- This might be why some 'older' users aren't getting pings
-- if the system picks the 'wrong' (old) token row.

SELECT 
    user_id, 
    COUNT(*) as token_count,
    string_agg(expo_push_token, ' | ') as tokens,
    MAX(updated_at) as latest_update
FROM app_push_tokens
GROUP BY user_id
HAVING COUNT(*) > 1
ORDER BY latest_update DESC;

-- 🔎 CHECK TOKEN REUSE
-- Check if the SAME token is assigned to DIFFERENT users
-- This happens if someone logs out and another logs in on the same phone.
SELECT 
    expo_push_token, 
    COUNT(DISTINCT user_id) as user_count,
    string_agg(user_id::text, ' | ') as user_ids
FROM app_push_tokens
GROUP BY expo_push_token
HAVING COUNT(DISTINCT user_id) > 1;
