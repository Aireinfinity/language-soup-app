-- Create clean app_messages table for mobile app
-- This replaces the old responses table for app messages

CREATE TABLE app_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL, -- from auth.users or hardcoded for testing
    group_id uuid REFERENCES groups(id) NOT NULL,
    challenge_id uuid REFERENCES challenges(id),
    message_type text NOT NULL DEFAULT 'text',
    content text,
    audio_url text,
    duration_seconds integer,
    user_name text NOT NULL, -- denormalized for speed
    avatar_url text,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE app_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view messages"
ON app_messages FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can send messages"
ON app_messages FOR INSERT
WITH CHECK (true); -- Allow all for testing, tighten later

-- Index for performance
CREATE INDEX idx_app_messages_challenge ON app_messages(challenge_id, created_at);
CREATE INDEX idx_app_messages_group ON app_messages(group_id, created_at);

-- Comments
COMMENT ON TABLE app_messages IS 'Messages sent in the mobile app (text and voice)';
COMMENT ON COLUMN app_messages.user_id IS 'User who sent the message (from auth.users or test user)';
COMMENT ON COLUMN app_messages.user_name IS 'Denormalized user name for fast display';
