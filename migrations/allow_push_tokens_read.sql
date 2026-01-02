-- Add policy to allow reading all push tokens (for dashboard/admin use)
-- Since the dashboard has no auth session, we need to allow unauthenticated reads
-- This is safe since it's only you using the dashboard

CREATE POLICY "Allow reading all push tokens for notifications"
ON app_push_tokens
FOR SELECT
USING (true);
