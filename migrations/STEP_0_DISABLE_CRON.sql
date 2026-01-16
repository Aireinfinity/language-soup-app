-- 🛑 STEP 0: DISABLE CRON (Safety First)
-- Run this BEFORE deploying the new functions

-- Disable the cron job temporarily
SELECT cron.unschedule(13);

-- Verify it's disabled
SELECT 
    jobid,
    schedule,
    command,
    active
FROM cron.job 
WHERE jobid = 13;

-- Should show: active = false
