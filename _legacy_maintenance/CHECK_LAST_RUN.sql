-- CHECK IF CRON RAN
-- Run this AFTER the scheduled time passes.
-- It shows the last 5 times the auto-sender woke up.

SELECT 
    jobid,
    runid,
    status,           -- 'succeeded' or 'failed'
    return_message,   -- '1 row affected' means it sent something! '0 rows' means it found nothing.
    start_time,
    end_time
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 5;
