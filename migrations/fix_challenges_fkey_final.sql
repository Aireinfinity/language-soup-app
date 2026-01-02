-- Drop the incorrect foreign key constraint and recreate it correctly
-- The constraint is currently pointing to auth.users instead of public.app_users

ALTER TABLE app_challenges 
DROP CONSTRAINT app_challenges_created_by_fkey;

ALTER TABLE app_challenges
ADD CONSTRAINT app_challenges_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES public.app_users(id) 
ON DELETE SET NULL;
