SELECT 
    display_name, 
    avatar_url, 
    created_at,
    (SELECT count(*) FROM app_group_members WHERE user_id = app_users.id) as group_count
FROM app_users 
WHERE display_name IN ('Paul', 'Arianna', 'Josiah', 'Boróka', 'Pablo')
ORDER BY created_at DESC;
