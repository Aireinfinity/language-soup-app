-- AUDIT CRON JOBS
-- checking if we have multiple bots running at the same time.

SELECT jobid, jobname, schedule, command, active 
FROM cron.job;
