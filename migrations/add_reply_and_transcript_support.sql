-- ============================================
-- Language Soup - Phase 1 Feature Migration
-- Adds support for: Message Replies, Voice Transcripts, Playback Speed
-- ============================================

-- 1. Add reply support to messages
ALTER TABLE app_messages 
ADD COLUMN IF NOT EXISTS reply_to_message_id uuid REFERENCES app_messages(id) ON DELETE SET NULL;

-- Add index for efficient reply lookups
CREATE INDEX IF NOT EXISTS idx_app_messages_replies ON app_messages(reply_to_message_id);

-- 2. Add voice message transcript support
ALTER TABLE app_messages 
ADD COLUMN IF NOT EXISTS transcript text,
ADD COLUMN IF NOT EXISTS transcript_language text;

-- 3. Add playback speed preference to users
ALTER TABLE app_users 
ADD COLUMN IF NOT EXISTS voice_playback_speed real DEFAULT 1.0;

-- 4. Add index for better message query performance with replies
CREATE INDEX IF NOT EXISTS idx_app_messages_group_created ON app_messages(group_id, created_at DESC);

-- Success message
SELECT 'Phase 1 migration completed successfully! ✅' as status;
