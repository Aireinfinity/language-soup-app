-- Debug: Find what data we actually have for Miranda / Anonymous
-- Run this in SQL Editor to see the results.

SELECT 
    au.id, 
    au.display_name as app_name, 
    u.email, 
    u.raw_user_meta_data 
FROM app_users au
JOIN auth.users u ON au.id = u.id
WHERE au.display_name ILIKE '%Anonymous%' 
   OR au.display_name ILIKE '%Miranda%'
   OR u.email ILIKE '%miranda%';
