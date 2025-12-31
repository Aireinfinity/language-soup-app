-- Check if challenges are stored as messages
SELECT 
    id,
    message_type,
    content,
    created_at
FROM app_messages
WHERE group_id = (
    SELECT group_id FROM challenge_shares WHERE share_link_id = '9d97ac6f'
)
AND message_type = 'challenge'
ORDER BY created_at DESC
LIMIT 5;
