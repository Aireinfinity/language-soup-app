-- Viral Challenge Sharing Feature
-- Creates table for tracking challenge shares and enables viral loop

-- Create challenge_shares table
CREATE TABLE IF NOT EXISTS challenge_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sharer_user_id UUID REFERENCES app_users(id) ON DELETE CASCADE NOT NULL,
  group_id UUID REFERENCES app_groups(id) ON DELETE CASCADE NOT NULL,
  challenge_message_id UUID REFERENCES app_messages(id) ON DELETE CASCADE NOT NULL,
  share_link_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_challenge_shares_link ON challenge_shares(share_link_id);
CREATE INDEX IF NOT EXISTS idx_challenge_shares_sharer ON challenge_shares(sharer_user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_shares_expires ON challenge_shares(expires_at);

-- RPC function to create a share link
CREATE OR REPLACE FUNCTION create_challenge_share(
  p_sharer_user_id UUID,
  p_group_id UUID,
  p_challenge_message_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_share_link_id TEXT;
BEGIN
  -- Generate random 8-character ID
  v_share_link_id := substring(md5(random()::text || clock_timestamp()::text) from 1 for 8);
  
  -- Insert share record
  INSERT INTO challenge_shares (
    sharer_user_id,
    group_id,
    challenge_message_id,
    share_link_id
  ) VALUES (
    p_sharer_user_id,
    p_group_id,
    p_challenge_message_id,
    v_share_link_id
  );
  
  -- Return the share link ID
  RETURN v_share_link_id;
END;
$$;

-- RPC function to get share details (for browser page)
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

-- Enable RLS
ALTER TABLE challenge_shares ENABLE ROW LEVEL SECURITY;

-- Policy: Users can create shares for their own messages
CREATE POLICY "Users can create their own shares"
  ON challenge_shares
  FOR INSERT
  WITH CHECK (auth.uid() = sharer_user_id);

-- Policy: Anyone can read non-expired shares (for browser page)
CREATE POLICY "Anyone can read non-expired shares"
  ON challenge_shares
  FOR SELECT
  USING (expires_at > NOW());

-- Policy: Users can view their own shares
CREATE POLICY "Users can view their own shares"
  ON challenge_shares
  FOR SELECT
  USING (auth.uid() = sharer_user_id);
