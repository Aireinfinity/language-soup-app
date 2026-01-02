-- Remove the policy we added that might be interfering
DROP POLICY IF EXISTS "Allow reading all push tokens for notifications" ON app_push_tokens;
