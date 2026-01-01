-- Check if push tokens are being saved for users
SELECT 
    u.display_name,
    u.id as user_id,
    pt.expo_push_token,
    pt.platform,
    pt.updated_at as token_updated_at
FROM app_users u
LEFT JOIN app_push_tokens pt ON u.id = pt.user_id
WHERE u.display_name LIKE '%noah%'
ORDER BY pt.updated_at DESC NULLS LAST;
