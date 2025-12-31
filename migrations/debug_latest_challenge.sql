-- Check the most recent challenge to see what's happening
SELECT 
    c.id as challenge_id,
    c.created_at,
    c.created_by,
    u.display_name as created_by_name,
    COUNT(m.id) as message_count,
    array_agg(m.id) as message_ids,
    array_agg(m.sender_id) as sender_ids,
    array_agg(u2.display_name) as sender_names
FROM app_challenges c
LEFT JOIN app_users u ON c.created_by = u.id
LEFT JOIN app_messages m ON m.challenge_id = c.id
LEFT JOIN app_users u2 ON m.sender_id = u2.id
WHERE c.created_at > NOW() - INTERVAL '5 minutes'
GROUP BY c.id, c.created_at, c.created_by, u.display_name
ORDER BY c.created_at DESC
LIMIT 3;
