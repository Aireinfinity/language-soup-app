-- ENABLE EASY MANUAL DELETIONS (CASCADE)
-- Run this once in your Supabase SQL Editor.
-- This makes it so if you delete a user, all their messages/data are deleted automatically.

-- 1. Fix Messages
ALTER TABLE app_messages 
DROP CONSTRAINT IF EXISTS app_messages_sender_id_fkey;
ALTER TABLE app_messages 
ADD CONSTRAINT app_messages_sender_id_fkey 
FOREIGN KEY (sender_id) REFERENCES app_users(id) ON DELETE CASCADE;

-- 2. Fix Group Memberships
ALTER TABLE app_group_members 
DROP CONSTRAINT IF EXISTS app_group_members_user_id_fkey;
ALTER TABLE app_group_members 
ADD CONSTRAINT app_group_members_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE;

-- 3. Fix Notifications
ALTER TABLE app_notifications 
DROP CONSTRAINT IF EXISTS app_notifications_user_id_fkey;
ALTER TABLE app_notifications 
ADD CONSTRAINT app_notifications_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE;

-- 4. Fix Scheduled Challenges (The one you hit earlier)
ALTER TABLE app_scheduled_challenges 
DROP CONSTRAINT IF EXISTS app_scheduled_challenges_created_by_fkey;
ALTER TABLE app_scheduled_challenges 
ADD CONSTRAINT app_scheduled_challenges_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES app_users(id) ON DELETE CASCADE;

-- 5. Fix Reactions (Just in case)
ALTER TABLE app_reactions
DROP CONSTRAINT IF EXISTS app_reactions_user_id_fkey;
ALTER TABLE app_reactions
ADD CONSTRAINT app_reactions_user_id_fkey
FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE;
