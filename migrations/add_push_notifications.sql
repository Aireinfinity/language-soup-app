-- Feature 10: Push Notifications System

-- 1. Notification Preferences Table
CREATE TABLE IF NOT EXISTS app_notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    new_messages BOOLEAN DEFAULT true,
    new_challenges BOOLEAN DEFAULT true,
    support_replies BOOLEAN DEFAULT true,
    push_enabled BOOLEAN DEFAULT true,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Push Tokens Table (stores Expo push tokens)
CREATE TABLE IF NOT EXISTS app_push_tokens (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    expo_push_token TEXT NOT NULL,
    device_id TEXT,
    platform TEXT, -- 'ios' or 'android'
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Notifications History Table
CREATE TABLE IF NOT EXISTS app_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'message', 'challenge', 'support'
    title TEXT NOT NULL,
    body TEXT,
    data JSONB, -- Additional data (group_id, message_id, etc.)
    read BOOLEAN DEFAULT false,
    sent_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT valid_notification_type CHECK (type IN ('message', 'challenge', 'support'))
);

-- 4. Enable RLS
ALTER TABLE app_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_notifications ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- Notification Preferences
CREATE POLICY "Users can view own preferences"
ON app_notification_preferences FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
ON app_notification_preferences FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
ON app_notification_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Push Tokens
CREATE POLICY "Users can view own tokens"
ON app_push_tokens FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own tokens"
ON app_push_tokens FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tokens"
ON app_push_tokens FOR UPDATE
USING (auth.uid() = user_id);

-- Notifications History
CREATE POLICY "Users can view own notifications"
ON app_notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
ON app_notifications FOR UPDATE
USING (auth.uid() = user_id);

-- 6. Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
ON app_notifications(user_id, read);

CREATE INDEX IF NOT EXISTS idx_notifications_created 
ON app_notifications(sent_at DESC);

-- 7. Function to send push notification (called by triggers)
-- Note: This would integrate with Expo's push notification service
-- For now, it just creates a notification record
CREATE OR REPLACE FUNCTION send_push_notification(
    p_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_body TEXT,
    p_data JSONB
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    -- Insert notification record
    INSERT INTO app_notifications (user_id, type, title, body, data)
    VALUES (p_user_id, p_type, p_title, p_body, p_data)
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
