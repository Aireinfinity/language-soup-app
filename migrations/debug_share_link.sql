-- Run this in Supabase SQL Editor to check what data is stored for your share link

SELECT 
    cs.share_link_id,
    cs.sharer_user_id,
    u.display_name as sharer_name,
    u.avatar_url as sharer_avatar,
    m.media_url as challenge_audio_url,
    m.content as challenge_content,
    g.language as group_language,
    g.level as group_level,
    cs.expires_at,
    (cs.expires_at < NOW()) as is_expired
FROM challenge_shares cs
JOIN app_users u ON cs.sharer_user_id = u.id
JOIN app_groups g ON cs.group_id = g.id
JOIN app_messages m ON cs.challenge_message_id = m.id
WHERE cs.share_link_id = 'b23327f6';
