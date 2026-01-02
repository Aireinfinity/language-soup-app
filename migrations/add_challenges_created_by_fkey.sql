-- Add foreign key constraint to app_challenges.created_by
-- This was missing, causing the insert to fail

ALTER TABLE app_challenges
ADD CONSTRAINT app_challenges_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES app_users(id) 
ON DELETE SET NULL;
