-- Update the get_challenge_share function to use signed URLs
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
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cs.id,
    u.display_name,
    u.avatar_url,
    g.name,
    g.language,
    g.level,
    m.content,
    -- Generate signed URL that expires with the challenge (24 hours)
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
$$;
