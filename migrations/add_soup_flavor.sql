-- Add soup_flavor column to app_users table
ALTER TABLE app_users 
ADD COLUMN IF NOT EXISTS soup_flavor text;

COMMENT ON COLUMN app_users.soup_flavor IS 'User''s selected soup flavor personality (e.g., Spicy, Salty, Chaotic)';
