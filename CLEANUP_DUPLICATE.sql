-- CRITICAL CLEANUP: Remove the old/duplicate job (id 12)
-- We only want 'process-scheduled-challenges-v2' (id 13) to remain.
SELECT cron.unschedule(12);

-- Verify it is gone (should only return id 13 now)
SELECT * FROM cron.job;
