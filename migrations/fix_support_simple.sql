-- Simplest Fix: Let Admins Write Support Messages

-- 1. Remove the broken rule
DROP POLICY IF EXISTS "Admins can send support messages" ON app_support_messages;

-- 2. Add the working rule (is_admin = true)
CREATE POLICY "Admins can send support messages"
ON app_support_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM app_users
    WHERE app_users.id = auth.uid()
    AND app_users.is_admin = true
  )
);
