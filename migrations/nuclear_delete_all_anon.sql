-- ============================================
-- Nuclear option: Delete ALL test data and sessions
-- USE WITH CAUTION - this wipes everything
-- ============================================

-- Step 1: Find all anonymous users
SELECT id, email, is_anonymous 
FROM auth.users 
WHERE is_anonymous = true;

-- Step 2: Delete app-level data (cascades to group_members, messages, etc.)
DELETE FROM app_users 
WHERE id IN (SELECT id::uuid FROM auth.users WHERE is_anonymous = true);

-- Step 3: Delete auth members (if any)
DELETE FROM auth.members
WHERE user_id::uuid IN (SELECT id FROM auth.users WHERE is_anonymous = true);

DELETE FROM auth.mfa_factors
WHERE user_id::uuid IN (SELECT id FROM auth.users WHERE is_anonymous = true);

DELETE FROM auth.sessions
WHERE user_id::uuid IN (SELECT id FROM auth.users WHERE is_anonymous = true);

DELETE FROM auth.refresh_tokens
WHERE user_id::uuid IN (SELECT id FROM auth.users WHERE is_anonymous = true);

DELETE FROM auth.identities
WHERE user_id::uuid IN (SELECT id FROM auth.users WHERE is_anonymous = true);

-- Step 4: Finally delete auth users
DELETE FROM auth.users WHERE is_anonymous = true;

-- Success
SELECT 'All anonymous users and sessions deleted! 🧹' as status;
