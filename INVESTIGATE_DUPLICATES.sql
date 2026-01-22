-- 🔎 SCHEMA & DUPLICATE INVESTIGATION
-- 1. Check if user_id is REALLY a Primary Key
SELECT 
    a.attname as column_name,
    format_type(a.atttypid, a.atttypmod) AS data_type,
    i.indisprimary AS is_primary
FROM pg_index i
JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
WHERE i.indrelid = 'app_push_tokens'::regclass;

-- 2. Find who has the most duplicates
SELECT 
    user_id, 
    COUNT(*) as row_count
FROM app_push_tokens
GROUP BY user_id
HAVING COUNT(*) > 1
ORDER BY row_count DESC;

-- 3. Look at John's specific duplicate mess
-- (Using display name to be safe)
SELECT 
    t.user_id,
    u.display_name,
    t.expo_push_token,
    t.updated_at
FROM app_push_tokens t
JOIN app_users u ON t.user_id = u.id
WHERE u.display_name ILIKE '%John%'
ORDER BY t.updated_at DESC;
