-- Add reply_to and edited_at columns to app_messages table
ALTER TABLE app_messages
ADD COLUMN IF NOT EXISTS reply_to UUID REFERENCES app_messages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;

-- Add index for reply_to lookups
CREATE INDEX IF NOT EXISTS idx_app_messages_reply_to ON app_messages(reply_to);

-- Add comment
COMMENT ON COLUMN app_messages.reply_to IS 'Reference to the message being replied to';
COMMENT ON COLUMN app_messages.edited_at IS 'Timestamp when message was last edited';
