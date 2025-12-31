-- Updated RPC to fetch challenge content from the most recent challenge message
-- BEFORE the voice response in the same group
CREATE OR REPLACE FUNCTION get_challenge_share(p_share_link_id TEXT)
RETURNS TABLE (
    share_id UUID,
    sharer_name TEXT,
    sharer_avatar TEXT,
    group_name TEXT,
    group_language TEXT,
    group_level TEXT,
    challenge_content TEXT,
    challenge_audio_url TEXT,
    expires_at TIMESTAMPTZ,
    is_expired BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cs.id as share_id,
        u.display_name as sharer_name,
        u.avatar_url as sharer_avatar,
        g.name as group_name,
        g.language as group_language,
        g.level as group_level,
        (
            -- Get the most recent challenge message before the voice response
            SELECT content 
            FROM app_messages 
            WHERE group_id = cs.group_id 
            AND message_type = 'challenge'
            AND created_at < (SELECT created_at FROM app_messages WHERE id = cs.challenge_message_id)
            ORDER BY created_at DESC 
            LIMIT 1
        ) as challenge_content,
        -- The voice message audio URL (signed URL that expires with the challenge)
        CASE 
            WHEN m.media_url IS NOT NULL THEN
                (SELECT url FROM storage.sign(
                    m.media_url,
                    EXTRACT(EPOCH FROM (cs.expires_at - NOW()))::integer
                ))
            ELSE NULL
        END as challenge_audio_url,
        cs.expires_at,
        (cs.expires_at < NOW()) as is_expired
    FROM challenge_shares cs
    JOIN app_users u ON cs.sharer_user_id = u.id
    JOIN app_groups g ON cs.group_id = g.id
    JOIN app_messages m ON cs.challenge_message_id = m.id
    WHERE cs.share_link_id = p_share_link_id;
END;
$$ LANGUAGE plpgsql;
