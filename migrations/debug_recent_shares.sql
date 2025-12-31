-- Check if the share link exists and what data it has
SELECT 
    cs.share_link_id,
    cs.sharer_user_id,
    cs.group_id,
    cs.challenge_message_id,
    cs.created_at,
    cs.expires_at,
    u.display_name as sharer_name,
    g.name as group_name,
    m.message_type as voice_message_type,
    m.media_url as voice_media_url,
    m.content as voice_content
FROM challenge_shares cs
LEFT JOIN app_users u ON cs.sharer_user_id = u.id
LEFT JOIN app_groups g ON cs.group_id = g.id
LEFT JOIN app_messages m ON cs.challenge_message_id = m.id
WHERE cs.share_link_id IN ('ca3836cb', '61aa9e1d', '1b4fd605')
ORDER BY cs.created_at DESC;
