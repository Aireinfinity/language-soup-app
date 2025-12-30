-- Add DELETE policy for admins on support messages
-- This allows admins to delete support tickets from the dashboard

-- Admins can delete support messages
CREATE POLICY IF NOT EXISTS "Admins can delete support messages"
    ON app_support_messages FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM app_users 
            WHERE app_users.id = auth.uid() 
            AND app_users.is_admin = true
        )
    );
