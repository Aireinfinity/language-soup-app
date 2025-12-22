-- Add edit and delete tracking columns to messages and challenges

-- Add columns to app_messages
ALTER TABLE app_messages 
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Add columns to app_challenges
ALTER TABLE app_challenges
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Create community manager permissions table
CREATE TABLE IF NOT EXISTS app_community_manager_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  group_id UUID REFERENCES app_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, group_id)
);

-- Add index for faster CM permission lookups
CREATE INDEX IF NOT EXISTS idx_cm_permissions_user ON app_community_manager_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_cm_permissions_group ON app_community_manager_permissions(group_id);
