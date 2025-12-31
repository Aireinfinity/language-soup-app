-- Check what message types exist in the database
SELECT DISTINCT message_type, COUNT(*) as count
FROM app_messages
GROUP BY message_type
ORDER BY count DESC;

-- Check recent messages in groups to see the pattern
SELECT 
    id,
    group_id,
    message_type,
    content,
    media_url,
    created_at
FROM app_messages
WHERE group_id IN (
    SELECT DISTINCT group_id 
    FROM challenge_shares 
    WHERE share_link_id IN ('ca3836cb', '61aa9e1d', '1b4fd605')
)
ORDER BY created_at DESC
LIMIT 20;
