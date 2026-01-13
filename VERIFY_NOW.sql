-- 1. CHECK CRON JOBS
-- You should ONLY see 'process-scheduled-challenges-v2' here.
-- If you see 'auto-send-challenges', run: SELECT cron.unschedule('auto-send-challenges');
SELECT jobid, jobname, schedule, active, command FROM cron.job;

-- 2. CHECK CHALLENGE STATUS
-- Look at the 'status' and 'scheduled_time'.
SELECT id, status, scheduled_time, challenge_text 
FROM app_scheduled_challenges 
WHERE challenge_text ILIKE '%fast fashion%';

-- 3. CHECK EXECUTION LOGS
-- See if the job ran recently and if it succeeded ('succeeded' status)
SELECT runid, job_pid, database, username, command, status, start_time, end_time 
FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 5;
