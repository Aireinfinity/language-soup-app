-- Direct Messages Table
-- Simple 1-on-1 messaging like WhatsApp
CREATE TABLE IF NOT EXISTS app_direct_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id uuid REFERENCES app_users(id) ON DELETE CASCADE,
    recipient_id uuid REFERENCES app_users(id) ON DELETE CASCADE,
    content text,
    message_type text DEFAULT 'text', -- 'text', 'voice', 'image', 'video'
    media_url text,
    duration_seconds integer, -- For voice messages
    created_at timestamp with time zone DEFAULT now(),
    read_at timestamp with time zone,
    deleted_at timestamp with time zone
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_dm_sender ON app_direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_dm_recipient ON app_direct_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_dm_created ON app_direct_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dm_participants ON app_direct_messages(sender_id, recipient_id);

-- Enable RLS
ALTER TABLE app_direct_messages ENABLE ROW LEVEL SECURITY;

-- Users can see messages they sent or received
CREATE POLICY "Users can view their DMs"
    ON app_direct_messages FOR SELECT
    USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Users can send DMs
CREATE POLICY "Users can send DMs"
    ON app_direct_messages FOR INSERT
    WITH CHECK (auth.uid() = sender_id);

-- Users can delete their own messages
CREATE POLICY "Users can delete their own DMs"
    ON app_direct_messages FOR UPDATE
    USING (auth.uid() = sender_id);
