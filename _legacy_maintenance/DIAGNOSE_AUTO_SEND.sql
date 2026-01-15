-- check cron jobs and their commands
SELECT jobid, jobname, schedule, command, active FROM cron.job;

-- check the specific challenge that failed to send
SELECT id, status, scheduled_time, challenge_text, created_at 
FROM app_scheduled_challenges 
WHERE challenge_text ILIKE '%fast fashion%';

-- check recent cron run details
SELECT jobid, runid, job_pid, database, username, command, status, return_message, start_time, end_time 
FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 5;
