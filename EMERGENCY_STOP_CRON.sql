-- EMERGENCY STOP
-- Run this if the cron job goes rogue.

SELECT cron.unschedule('process-scheduled-challenges-v2');

-- Verify it's gone
SELECT * FROM cron.job;
