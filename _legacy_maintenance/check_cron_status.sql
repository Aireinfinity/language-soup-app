-- 1. Check if pg_cron is enabled
SELECT * FROM cron.job;

-- 2. Check if the System Bot exists (Required for sending challenges)
SELECT * FROM app_users WHERE id = '00000000-0000-0000-0000-000000000000';

-- 3. Check for any pending challenges that should have been sent but are stuck
SELECT id, status, scheduled_time, challenge_text, created_at 
FROM app_scheduled_challenges 
WHERE status = 'pending' 
AND scheduled_time <= NOW()
ORDER BY scheduled_time;

-- 4. Check Cron Job Run History (Last 5 runs)
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 5;
