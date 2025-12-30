-- Add emoji_password column to app_users table
ALTER TABLE app_users 
ADD COLUMN IF NOT EXISTS emoji_password TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_app_users_display_name 
ON app_users(display_name);
