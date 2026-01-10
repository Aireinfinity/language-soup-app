-- Fix: Remove Duplicate Cron Jobs
-- You have TWO cron jobs doing the same thing, causing conflicts

-- First, let's see what each job is doing
SELECT jobid, jobname, schedule, command 
FROM cron.job 
WHERE jobname IN ('auto-send-challenges', 'send-scheduled-challenges');

-- Decision: Keep 'send-scheduled-challenges' (jobid 3) and remove 'auto-send-challenges' (jobid 1)
-- This is the one we created in the migration files

-- Remove the duplicate job
SELECT cron.unschedule(1); -- Removes 'auto-send-challenges'

-- Verify only one job remains
SELECT jobid, jobname, schedule, active 
FROM cron.job 
WHERE jobname LIKE '%challenge%';

-- Expected result: Only 'send-scheduled-challenges' (jobid 3) should remain
