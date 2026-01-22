-- 🔎 COUNT AUDIT
-- Why did we go from 119 to 94?

-- 1. Check for Duplicate Rows (Same user, multiple tokens)
SELECT 
    'Raw Rows in app_push_tokens' as metric, COUNT(*) as count FROM app_push_tokens
UNION ALL
SELECT 
    'Unique user_ids in app_push_tokens', COUNT(DISTINCT user_id) FROM app_push_tokens;

-- 2. Check if Eva has more than one row
SELECT 
    user_id, 
    expo_push_token, 
    updated_at,
    created_at
FROM app_push_tokens
WHERE user_id = '00743f8e-b2a3-440b-b3ed-f222f81a8b86' -- Eva Merrin :)
ORDER BY updated_at DESC;

-- 3. Check for specific users with most duplicate tokens
SELECT 
    u.display_name, 
    t.user_id, 
    COUNT(*) as row_count
FROM app_push_tokens t
JOIN app_users u ON t.user_id = u.id
GROUP BY u.display_name, t.user_id
HAVING COUNT(*) > 1
ORDER BY row_count DESC
LIMIT 10;
