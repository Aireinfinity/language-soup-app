-- Add is_community_manager column to app_users
ALTER TABLE app_users 
ADD COLUMN is_community_manager boolean DEFAULT false;

-- Notify
SELECT 'Added is_community_manager column to app_users table' as status;
