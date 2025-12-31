-- Check if requesters exist in app_users
SELECT 
    r.id as request_id, 
    r.user_id as requester_id,
    u.id as user_profile_id,
    u.display_name
FROM app_language_requests r
LEFT JOIN app_users u ON r.user_id = u.id
WHERE r.status = 'pending';
