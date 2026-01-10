-- Debug: Why didn't the challenge send?
-- Run this to see what's happening

-- 1. Check if the cron job actually ran
SELECT jobid, runid, status, return_message, start_time, end_time
FROM cron.job_run_details 
WHERE jobid = 1
ORDER BY start_time DESC 
LIMIT 5;

-- 2. Check if the challenge is still pending
SELECT id, challenge_text, status, scheduled_time, created_at
FROM app_scheduled_challenges 
WHERE challenge_text LIKE '%animal%'
ORDER BY created_at DESC;

-- 3. Check if it was inserted into app_challenges
SELECT id, group_id, prompt_text, created_by, created_at
FROM app_challenges
WHERE prompt_text LIKE '%animal%'
ORDER BY created_at DESC
LIMIT 5;

-- 4. Verify System Bot exists
SELECT id, username, full_name
FROM app_users 
WHERE id = '00000000-0000-0000-0000-000000000000';

-- 5. Check if there are ANY groups to send to
SELECT id, name, language, member_count
FROM app_groups
ORDER BY created_at
LIMIT 5;
