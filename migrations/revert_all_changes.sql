-- Revert all database changes made during this session
-- Run these in order:

-- 1. Restore the original "Users can view own tokens" policy
CREATE POLICY "Users can view own tokens"
ON app_push_tokens
FOR SELECT
USING (auth.uid() = user_id);

-- 2. Remove the permissive policy we added
DROP POLICY IF EXISTS "Allow reading all push tokens for notifications" ON app_push_tokens;

-- 3. Revert the foreign key constraint change (if it was changed)
-- Check what it currently points to first with the check query
-- If it points to public.app_users, change it back to auth.users:
-- ALTER TABLE app_challenges DROP CONSTRAINT app_challenges_created_by_fkey;
-- ALTER TABLE app_challenges ADD CONSTRAINT app_challenges_created_by_fkey 
-- FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
