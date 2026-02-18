-- One-off: Reassign app_scheduled_challenges from archived "Noah" profile(s) to your current user.
-- Run this in Supabase SQL Editor if your dashboard shows "no challenges queued" after archiving profiles.
--
-- If step 1 returns 0 rows, the queue may have been deleted (e.g. old profile was deleted and CASCADE
-- or a purge script removed rows). In that case you need to re-add challenges in the dashboard.
--
-- Option A: Run while logged in as you in the dashboard (if SQL Editor uses auth).
-- Option B: Replace YOUR_CURRENT_USER_ID with your actual app_users.id (the one you use to log in now).

-- 1) See what we're about to fix (optional)
SELECT id, created_by, status, scheduled_time, left(challenge_text, 60) AS preview
FROM app_scheduled_challenges
WHERE created_by IN (SELECT id FROM app_users WHERE display_name ILIKE 'Noah :) (archived_%');

-- 2) Reassign to your current user (pick one)

-- If Supabase SQL Editor runs as authenticated user:
UPDATE app_scheduled_challenges
SET created_by = auth.uid()
WHERE created_by IN (SELECT id FROM app_users WHERE display_name ILIKE 'Noah :) (archived_%');

-- If you need to set the target user explicitly (replace the UUID with your real id):
-- UPDATE app_scheduled_challenges
-- SET created_by = 'YOUR_CURRENT_USER_ID'::uuid
-- WHERE created_by IN (SELECT id FROM app_users WHERE display_name ILIKE 'Noah :) (archived_%');

-- 3) Confirm (optional)
-- SELECT count(*) FROM app_scheduled_challenges WHERE status IN ('pending','approved');
