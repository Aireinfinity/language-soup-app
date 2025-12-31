-- Check if the Language Soup bot account exists and what its avatar is
SELECT 
    id,
    display_name,
    avatar_url,
    is_admin,
    created_at
FROM app_users
WHERE id = '00000000-0000-0000-0000-000000000000';
