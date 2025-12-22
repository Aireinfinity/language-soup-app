-- Add deleted_at and edited_at columns to all message tables for edit/delete functionality

-- Add to app_messages (group chats)
ALTER TABLE app_messages 
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS edited_at timestamp with time zone;

-- Add to app_support_messages (support chats)
ALTER TABLE app_support_messages 
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS edited_at timestamp with time zone;

-- Add to app_community_messages (community chat)
ALTER TABLE app_community_messages 
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS edited_at timestamp with time zone;
