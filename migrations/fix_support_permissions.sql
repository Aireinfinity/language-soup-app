-- Fix Support Ticket Permissions
-- The problem: Database was checking for 'role' column which doesn't exist/isn't used
-- The fix: Change permissions to check 'is_admin' flag instead

-- 1. Remove the broken policies
DROP POLICY IF EXISTS "Admins can send support messages" ON app_support_messages;
DROP POLICY IF EXISTS "Admins can read all support messages" ON app_support_messages;
DROP POLICY IF EXISTS "Users can send support messages" ON app_support_messages;

-- 2. Add the correct policies using is_admin
CREATE POLICY "Admins can send support messages"
ON app_support_messages FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM app_users
        WHERE app_users.id = auth.uid()
        AND (app_users.is_admin = true OR app_users.is_community_manager = true)
    )
);

CREATE POLICY "Users can send support messages"
ON app_support_messages FOR INSERT
WITH CHECK (
    user_id = auth.uid() AND from_admin = false
);

CREATE POLICY "Admins can read all support messages"
ON app_support_messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM app_users
        WHERE app_users.id = auth.uid()
        AND (app_users.is_admin = true OR app_users.is_community_manager = true)
    )
);

-- 3. Ensure columns exist (safeguard)
ALTER TABLE app_support_messages 
ADD COLUMN IF NOT EXISTS from_admin BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new',
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'P2';
