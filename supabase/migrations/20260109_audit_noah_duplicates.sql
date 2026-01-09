-- AUDIT: Find all Noah profiles and their auth sources
-- This will help us understand the duplicate profile issue

-- 1. Find all users with "noah" in their name
SELECT 
    au.id,
    au.display_name,
    au.is_admin,
    au.created_at as profile_created,
    u.email,
    u.created_at as auth_created,
    u.raw_user_meta_data,
    u.is_anonymous
FROM app_users au
LEFT JOIN auth.users u ON au.id = u.id
WHERE au.display_name ILIKE '%noah%'
ORDER BY au.created_at DESC;

-- 2. Count how many Noah profiles exist
SELECT COUNT(*) as noah_count
FROM app_users
WHERE display_name ILIKE '%noah%';

-- 3. Find anonymous auth users (dashboard logins)
SELECT 
    au.id,
    au.display_name,
    au.is_admin,
    au.created_at,
    u.is_anonymous
FROM app_users au
JOIN auth.users u ON au.id = u.id
WHERE u.is_anonymous = true
ORDER BY au.created_at DESC
LIMIT 20;
