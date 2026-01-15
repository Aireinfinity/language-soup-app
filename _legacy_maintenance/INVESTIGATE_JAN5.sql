-- INVESTIGATE: What was working on Jan 5th?

-- Check what challenges were sent on Jan 5th
SELECT id, challenge_text, scheduled_time, status, created_at
FROM app_scheduled_challenges
WHERE scheduled_time::date = '2026-01-05'
OR created_at::date = '2026-01-05'
ORDER BY scheduled_time;

-- Check if there were any function changes around that time
SELECT 
    proname as function_name,
    prosrc as function_code
FROM pg_proc
WHERE proname IN ('send_due_challenges', 'auto_send_approved_challenges')
ORDER BY proname;

-- Check cron job history
SELECT * FROM cron.job_run_details 
WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname LIKE '%challenge%')
ORDER BY start_time DESC
LIMIT 20;
