-- Add RLS policy to allow reading push tokens for admins/bots
-- This allows the dashboard to fetch tokens for sending notifications

CREATE POLICY "Admins can read all push tokens"
ON app_push_tokens
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM app_users
        WHERE app_users.id = auth.uid()
        AND app_users.is_admin = true
    )
);
