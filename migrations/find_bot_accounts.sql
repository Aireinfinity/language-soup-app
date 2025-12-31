-- Search for any bot or "language soup" accounts
SELECT 
    id,
    display_name,
    avatar_url,
    is_admin,
    created_at
FROM app_users
WHERE 
    LOWER(display_name) LIKE '%language%soup%'
    OR LOWER(display_name) LIKE '%bot%'
    OR id = '00000000-0000-0000-0000-000000000000'
ORDER BY created_at DESC;
