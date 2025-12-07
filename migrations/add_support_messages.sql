-- Add support messages table for 24/7 chat with admin
-- This connects user support chats to the admin panel

-- Drop if exists to recreate with correct schema
DROP TABLE IF EXISTS app_support_messages CASCADE;

-- Create support messages table
CREATE TABLE app_support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    from_admin BOOLEAN DEFAULT false,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'voice')),
    media_url TEXT,
    duration_seconds INTEGER,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE app_support_messages ENABLE ROW LEVEL SECURITY;

-- Users can read their own messages
CREATE POLICY "Users can read their own support messages"
    ON app_support_messages FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own messages (not admin ones)
CREATE POLICY "Users can send support messages"
    ON app_support_messages FOR INSERT
    WITH CHECK (auth.uid() = user_id AND from_admin = false);

-- Admins can read all support messages
CREATE POLICY "Admins can read all support messages"
    ON app_support_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM app_users 
            WHERE app_users.id = auth.uid() 
            AND app_users.role = 'admin'
        )
    );

-- Admins can insert messages to any thread
CREATE POLICY "Admins can send support messages"
    ON app_support_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM app_users 
            WHERE app_users.id = auth.uid() 
            AND app_users.role = 'admin'
        )
    );

-- Admins can update messages (mark as read)
CREATE POLICY "Admins can update support messages"
    ON app_support_messages FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM app_users 
            WHERE app_users.id = auth.uid() 
            AND app_users.role = 'admin'
        )
    );

-- Create indexes for performance
CREATE INDEX idx_support_messages_user_id ON app_support_messages(user_id);
CREATE INDEX idx_support_messages_created_at ON app_support_messages(created_at DESC);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE app_support_messages;
