-- 🔎 UNMASKING JOHN
-- If user_id is the Primary Key, he CANNOT have 15 rows for one ID.
-- Therefore, he must have 15 DIFFERENT IDs.

SELECT 
    t.user_id,
    u.display_name,
    u.email,
    u.created_at as account_created,
    t.expo_push_token,
    t.updated_at as token_updated
FROM app_push_tokens t
LEFT JOIN app_users u ON t.user_id = u.id
WHERE u.display_name ILIKE '%John%'
ORDER BY u.created_at ASC;

-- Check for people with tokens but NO entry in app_users
-- (Maybe his old rows are for users that were deleted from app_users?)
SELECT 
    t.user_id, 
    t.expo_push_token, 
    t.updated_at
FROM app_push_tokens t
LEFT JOIN app_users u ON t.user_id = u.id
WHERE u.id IS NULL;
