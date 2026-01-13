-- Check: Was the edge function working on Jan 5th?

-- Look at cron job run history
SELECT 
    runid,
    jobid,
    status,
    return_message,
    start_time,
    end_time
FROM cron.job_run_details
WHERE start_time >= '2026-01-05'
AND start_time < '2026-01-06'
ORDER BY start_time DESC
LIMIT 50;
