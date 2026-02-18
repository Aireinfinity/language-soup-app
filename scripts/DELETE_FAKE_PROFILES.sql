-- Delete test profiles whose display_name is "fake" + optional number (e.g. fake 1, fake 20).
-- Run in Supabase Dashboard → SQL Editor. Due to ON DELETE CASCADE, related rows in
-- app_messages, app_group_members, app_push_tokens, etc. will be removed automatically.
--
-- Optional: Remove from Auth too (Dashboard → Authentication → Users) so they can't log in again.

-- 1) Preview: see who would be deleted (run this first)
SELECT id, display_name, created_at
FROM app_users
WHERE display_name = 'fake'
   OR display_name ILIKE 'fake %'   -- "fake 1", "fake 20", etc.
   OR display_name ~* '^fake\d+$'   -- "fake1", "fake20" (no space)
ORDER BY display_name;

-- 2) Delete (uncomment and run after you confirm the list above)
-- DELETE FROM app_users
-- WHERE display_name = 'fake'
--    OR display_name ILIKE 'fake %'
--    OR display_name ~* '^fake\d+$';
