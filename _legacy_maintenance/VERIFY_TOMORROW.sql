-- VERIFY TOMORROW'S CHALLENGE WILL SEND

-- 1. Check the challenge is approved and scheduled correctly
SELECT id, challenge_text, status, scheduled_time, created_at
FROM app_scheduled_challenges
WHERE challenge_text LIKE '%scary%';

-- 2. Verify cron job is active
SELECT jobid, jobname, active, schedule
FROM cron.job
WHERE jobid = 6;

-- 3. Check System Bot exists
SELECT id, display_name FROM app_users WHERE id = '00000000-0000-0000-0000-000000000000';

-- Expected results:
-- 1. status = 'approved', scheduled_time = '2026-01-11 13:35:00+00' (2:35 PM UTC)
-- 2. active = true
-- 3. display_name = 'language soup'

-- If all 3 check out, it WILL send tomorrow at 2:35 PM!
