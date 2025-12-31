-- Check what challenges exist for the Hungarian group
SELECT 
    c.id,
    c.prompt_text,
    c.challenge_date,
    c.expires_at,
    cs.created_at as share_created_at,
    m.created_at as voice_message_created_at
FROM challenges c
JOIN challenge_shares cs ON c.group_id = cs.group_id
JOIN app_messages m ON cs.challenge_message_id = m.id
WHERE cs.share_link_id = '9d97ac6f'
ORDER BY c.challenge_date DESC;
