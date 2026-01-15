-- Check current cron job status
SELECT jobid, jobname, schedule, active, command 
FROM cron.job 
WHERE jobname LIKE '%challenge%'
ORDER BY jobid;

-- Also check if the function exists now
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'auto_send_approved_challenges'
  AND routine_schema = 'public';
