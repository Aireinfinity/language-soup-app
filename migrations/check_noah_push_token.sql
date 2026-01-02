-- Check if your user has a valid push token
-- Replace 'YOUR_USER_ID' with your actual user ID from the app

SELECT 
    u.display_name,
    u.id as user_id,
    pt.expo_push_token,
    pt.created_at as token_created,
    pt.updated_at as token_updated
FROM app_users u
LEFT JOIN app_push_tokens pt ON u.id = pt.user_id
WHERE u.display_name = 'Noah :)'
ORDER BY pt.updated_at DESC;
