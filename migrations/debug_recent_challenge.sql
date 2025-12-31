-- Check the recent challenge to see how many messages were created
SELECT 
    c.id as challenge_id,
    c.created_by,
    c.created_at,
    COUNT(m.id) as message_count,
    array_agg(m.sender_id) as sender_ids,
    array_agg(u.display_name) as sender_names
FROM app_challenges c
LEFT JOIN app_messages m ON m.challenge_id = c.id
LEFT JOIN app_users u ON m.sender_id = u.id
WHERE c.created_at > NOW() - INTERVAL '10 minutes'
GROUP BY c.id
ORDER BY c.created_at DESC
LIMIT 5;
