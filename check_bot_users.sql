-- Check what bot/system users already exist
SELECT id, username, full_name, avatar_url 
FROM app_users 
WHERE username LIKE '%bot%' OR username LIKE '%system%' OR full_name LIKE '%bot%' OR full_name LIKE '%soup%'
ORDER BY created_at;
