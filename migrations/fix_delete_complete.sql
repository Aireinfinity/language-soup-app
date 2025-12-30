-- ============================================
-- Complete Fix for Support Ticket Delete
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Drop and recreate DELETE policy
DROP POLICY IF EXISTS "Admins can delete support messages" ON app_support_messages;

CREATE POLICY "Admins can delete support messages"
ON app_support_messages
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM app_users
        WHERE app_users.id = auth.uid()
        AND app_users.is_admin = true
    )
);

-- Step 2: Verify your admin user is set correctly
-- Replace 'YOUR_USER_ID' with your actual user ID from auth.users
-- You can find it by running: SELECT id, email FROM auth.users;

-- Uncomment and run this if you need to set yourself as admin:
-- UPDATE app_users SET is_admin = true WHERE id = 'YOUR_USER_ID';

-- Step 3: Check if it worked
SELECT 
    'Delete policy created! ✅' as status,
    EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'app_support_messages' 
        AND policyname = 'Admins can delete support messages'
    ) as policy_exists;

-- Step 4: Verify you are admin
SELECT 
    id,
    display_name,
    is_admin,
    CASE 
        WHEN is_admin = true THEN '✅ You are admin'
        ELSE '❌ NOT admin - run UPDATE command above'
    END as admin_status
FROM app_users 
WHERE id = auth.uid();
