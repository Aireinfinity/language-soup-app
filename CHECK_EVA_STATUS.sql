-- Check Eva's details (Corrected: removed email column)
SELECT 
    au.id, 
    au.display_name, 
    -- au.email, -- Removed because column doesn't exist
    apt.expo_push_token as push_token,
    anp.push_enabled,
    anp.new_challenges
FROM app_users au
LEFT JOIN app_push_tokens apt ON au.id = apt.user_id
LEFT JOIN app_notification_preferences anp ON au.id = anp.user_id
WHERE au.display_name ILIKE '%Eva%';
