-- 🚀 FINAL STEP: ENABLE CRON WITH PROD FUNCTION
-- Run this ONLY after testing works

-- Re-enable the cron with the PROD function
SELECT cron.schedule(
    'process-challenges',
    '* * * * *',  -- Every minute
    'SELECT process_scheduled_challenges_PROD()'
);

-- Verify it's enabled
SELECT 
    jobid,
    schedule,
    command,
    active
FROM cron.job 
WHERE command LIKE '%process_scheduled_challenges_PROD%';

-- Should show: active = true
