-- Find what avatar URLs look like in your system
SELECT DISTINCT avatar_url 
FROM app_users 
WHERE avatar_url IS NOT NULL 
LIMIT 10;
