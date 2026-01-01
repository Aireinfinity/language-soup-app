-- Delete related data for user 7a0054d4-2e8c-468d-826e-5395b01a77f4

-- 1. Group Memberships
DELETE FROM app_group_members WHERE user_id = '7a0054d4-2e8c-468d-826e-5395b01a77f4';

-- 2. Message Reactions
DELETE FROM app_message_reactions WHERE user_id = '7a0054d4-2e8c-468d-826e-5395b01a77f4';

-- 3. Messages (Optional: Delete or anonymize? Usually delete if it's a test user)
DELETE FROM app_messages WHERE sender_id = '7a0054d4-2e8c-468d-826e-5395b01a77f4';

-- 4. Support Messages
DELETE FROM app_support_messages WHERE user_id = '7a0054d4-2e8c-468d-826e-5395b01a77f4';

-- 5. Language Requests
DELETE FROM app_language_requests WHERE user_id = '7a0054d4-2e8c-468d-826e-5395b01a77f4';

-- 6. Challenges (if any created by them, though unlikely for non-admin)
-- DELETE FROM app_challenges WHERE creator_id = '7a0054d4-2e8c-468d-826e-5395b01a77f4';

-- 7. Finally, delete the user profile
DELETE FROM app_users WHERE id = '7a0054d4-2e8c-468d-826e-5395b01a77f4';

-- 8. Delete from auth.users (if possible via SQL editor, otherwise assume app_users is enough for app logic)
-- Note: Often we cannot delete from auth.users purely via SQL client depending on permissions, but we'll try or rely on cascade if setup.
