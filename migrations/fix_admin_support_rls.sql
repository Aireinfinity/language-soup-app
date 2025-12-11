-- ============================================
-- Fix Admin Support Messages & Tickets
-- Ensures admins can send messages and create/update tickets
-- ============================================

-- Drop any restrictive policies
DROP POLICY IF EXISTS "Users can view their support messages" ON app_support_messages;
DROP POLICY IF EXISTS "Users can send support messages" ON app_support_messages;
DROP POLICY IF EXISTS "Support messages viewable by owners and admins" ON app_support_messages;
DROP POLICY IF EXISTS "Admins can manage support" ON app_support_messages;
DROP POLICY IF EXISTS "Admins can update support messages" ON app_support_messages;
DROP POLICY IF EXISTS "Admins can delete support messages" ON app_support_messages;
DROP POLICY IF EXISTS "Users see their own support threads" ON app_support_messages;

-- Allow users to view their own support messages
CREATE POLICY "Users see their own support threads"
ON app_support_messages
FOR SELECT
USING (
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM app_users
        WHERE app_users.id = auth.uid()
        AND (app_users.is_admin = true OR app_users.is_community_manager = true)
    )
);

-- Allow users to insert their own support messages
CREATE POLICY "Users can send support messages"
ON app_support_messages
FOR INSERT
WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM app_users
        WHERE app_users.id = auth.uid()
        AND (app_users.is_admin = true OR app_users.is_community_manager = true)
    )
);

-- Allow admins to update any support message (for status, priority, etc.)
CREATE POLICY "Admins can update support messages"
ON app_support_messages
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM app_users
        WHERE app_users.id = auth.uid()
        AND (app_users.is_admin = true OR app_users.is_community_manager = true)
    )
);

-- Allow admins to delete support messages if needed
CREATE POLICY "Admins can delete support messages"
ON app_support_messages
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM app_users
        WHERE app_users.id = auth.uid()
        AND (app_users.is_admin = true OR app_users.is_community_manager = true)
    )
);

-- Success message
SELECT 'Admin support & ticket permissions fixed! ✅' as status;
