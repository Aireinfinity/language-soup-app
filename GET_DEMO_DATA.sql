-- Get latest challenge in French beginner group
SELECT 
    c.id,
    c.prompt_text,
    c.created_at,
    g.name as group_name,
    g.language
FROM app_challenges c
JOIN app_groups g ON g.id = c.group_id
WHERE g.language ILIKE '%french%'
AND g.name ILIKE '%beginner%'
ORDER BY c.created_at DESC
LIMIT 1;

-- Get Noah's most recent voice memo in French group
SELECT 
    m.id,
    m.media_url,
    m.created_at,
    m.duration_seconds,
    g.name as group_name,
    g.language
FROM app_messages m
JOIN app_groups g ON g.id = m.group_id
WHERE m.message_type = 'voice'
AND m.sender_id = '29864936-719c-483b-ac6a-4d06084a48fe'  -- Noah
AND g.language ILIKE '%french%'
AND m.media_url IS NOT NULL
ORDER BY m.created_at DESC
LIMIT 1;
