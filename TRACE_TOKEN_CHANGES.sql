-- 🔎 TRACK TOKEN CHANGES
-- Shows users whose token value has changed over time.
-- This requires the table to have a record of old tokens (unlikely if upsert is working).
-- BUT, if upsert is broken and creating new rows, this will show it.

SELECT 
    user_id,
    expo_push_token,
    updated_at,
    LAG(expo_push_token) OVER (PARTITION BY user_id ORDER BY updated_at ASC) as previous_token
FROM app_push_tokens
WHERE user_id = '26d90cc6-2d3e-43ca-bf71-60f51dbf3e44' -- Check Eva specifically
ORDER BY updated_at DESC;

-- Check if any user has multiple ACTIVE tokens
SELECT 
    u.display_name,
    t.user_id,
    COUNT(t.expo_push_token) as total_tokens
FROM app_push_tokens t
JOIN users u ON t.user_id = u.id
GROUP BY u.display_name, t.user_id
HAVING COUNT(t.expo_push_token) > 1
ORDER BY total_tokens DESC;
