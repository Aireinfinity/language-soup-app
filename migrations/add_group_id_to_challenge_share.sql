-- Add group_id and challenge_message_id to get_challenge_share for deep linking
-- This enables "Already have the app?" button to open directly to the challenge

-- Must drop first because we're changing the return type
DROP FUNCTION IF EXISTS get_challenge_share(TEXT);

CREATE OR REPLACE FUNCTION get_challenge_share(p_share_link_id TEXT)
RETURNS TABLE (
    share_id UUID,
    sharer_name TEXT,
    sharer_avatar TEXT,
    group_id UUID,
    group_name TEXT,
    group_language TEXT,
    group_level TEXT,
    challenge_message_id UUID,
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
        cs.group_id as group_id,
        g.name as group_name,
        g.language as group_language,
        g.level as group_level,
        cs.challenge_message_id as challenge_message_id,
        (
            -- Get the most recent challenge message before the voice response
            SELECT REPLACE(content, '#challenge' || E'\n', '')
            FROM app_messages 
            WHERE app_messages.group_id = cs.group_id 
            AND content LIKE '#challenge%'
            AND created_at < (SELECT created_at FROM app_messages WHERE id = cs.challenge_message_id)
            ORDER BY created_at DESC 
            LIMIT 1
        ) as challenge_content,
        -- Return raw media URL (no signing)
        m.media_url as challenge_audio_url,
        cs.expires_at,
        (cs.expires_at < NOW()) as is_expired
    FROM challenge_shares cs
    JOIN app_users u ON cs.sharer_user_id = u.id
    JOIN app_groups g ON cs.group_id = g.id
    JOIN app_messages m ON cs.challenge_message_id = m.id
    WHERE cs.share_link_id = p_share_link_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
