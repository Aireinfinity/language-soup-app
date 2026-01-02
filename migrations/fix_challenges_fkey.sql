-- Fix the foreign key constraint on app_challenges.created_by
-- It's currently pointing to 'users' but should point to 'app_users'

-- Drop the old constraint
ALTER TABLE app_challenges 
DROP CONSTRAINT IF EXISTS app_challenges_created_by_fkey;

-- Add the correct constraint
ALTER TABLE app_challenges
ADD CONSTRAINT app_challenges_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES app_users(id) 
ON DELETE SET NULL;
