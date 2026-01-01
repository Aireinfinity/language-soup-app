-- 🧹 MASTER CLEANUP SCRIPT
-- Removes all test users created during the verification process.

-- 1. Remove Test Ghost (Active, Archived, and everything in between)
DELETE FROM app_users WHERE display_name ILIKE '%Test Ghost%';

-- 2. Remove Test Newb
DELETE FROM app_users WHERE display_name ILIKE '%Test Newb%';

-- 3. (Optional) Remove from Auth.users if you have permissions (Dashboard only)
-- DELETE FROM auth.users WHERE email LIKE 'testghost%@internal.languagesoup.com';
-- DELETE FROM auth.users WHERE email LIKE 'testnewb%@internal.languagesoup.com';
