-- ============================================
-- Delete a user by display name
-- Replace 'USERNAME_HERE' with the actual username
-- ============================================

-- First, find the user ID
SELECT id, display_name, email 
FROM app_users 
WHERE display_name = 'USERNAME_HERE';

-- Delete from app_users (this will cascade to group memberships)
DELETE FROM app_users 
WHERE display_name = 'USERNAME_HERE';

-- ALSO delete from Supabase Auth (clears session completely)
DELETE FROM auth.users
WHERE id IN (
    SELECT id FROM app_users WHERE display_name = 'USERNAME_HERE'
);

-- Or if you already deleted from app_users, delete ALL anonymous auth users:
-- DELETE FROM auth.users WHERE is_anonymous = true;

-- Success message
SELECT 'User and auth session deleted! Refresh the app to start fresh.' as status;
