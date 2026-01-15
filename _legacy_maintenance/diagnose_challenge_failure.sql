-- Comprehensive Diagnostic for Scheduled Challenge Failure
-- Run this in Supabase SQL Editor to diagnose why the challenge didn't send

-- 1. Check if the cron job exists and is active
SELECT jobid, jobname, schedule, active, database 
FROM cron.job 
WHERE jobname LIKE '%challenge%';

-- 2. Check recent cron job execution history
SELECT jobid, runid, job_pid, database, username, command, status, return_message, start_time, end_time
FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 10;

-- 3. Verify the System Bot user exists (required for challenge creation)
SELECT id, username, full_name, created_at
FROM app_users 
WHERE id = '00000000-0000-0000-0000-000000000000';

-- 4. Check the specific challenge that should have been sent
SELECT id, challenge_text, status, scheduled_time, created_at, created_by
FROM app_scheduled_challenges 
WHERE challenge_text LIKE '%animal%'
ORDER BY created_at DESC;

-- 5. Check if any challenges are stuck in 'pending' status past their scheduled time
SELECT id, challenge_text, status, scheduled_time, 
       NOW() as current_time,
       (NOW() - scheduled_time) as time_overdue
FROM app_scheduled_challenges 
WHERE status = 'pending' 
  AND scheduled_time <= NOW()
ORDER BY scheduled_time;

-- 6. Check if the challenge was actually sent to app_challenges table
SELECT id, group_id, prompt_text, created_by, created_at
FROM app_challenges
WHERE prompt_text LIKE '%animal%'
ORDER BY created_at DESC
LIMIT 5;

-- 7. Verify Database Webhooks are configured (this is a manual check in Supabase Dashboard)
-- Go to: Database -> Webhooks
-- Expected: A webhook on 'app_challenges' table, INSERT event, pointing to 'send-push-notification' function
