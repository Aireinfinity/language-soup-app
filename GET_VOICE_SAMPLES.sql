-- Get Noah's recent voice memos for accuracy testing
SELECT 
    m.id,
    m.media_url,
    m.created_at,
    g.name as group_name,
    g.language,
    m.duration_seconds
FROM app_messages m
JOIN app_groups g ON g.id = m.group_id
WHERE m.message_type = 'voice'
AND m.sender_id = '29864936-719c-483b-ac6a-4d06084a48fe'  -- Noah
AND m.media_url IS NOT NULL
ORDER BY m.created_at DESC
LIMIT 15;
