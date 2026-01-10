-- Check if pg_cron is enabled and what jobs exist
SELECT * FROM cron.job;

-- Check if the scheduled challenges table exists
SELECT * FROM app_scheduled_challenges LIMIT 5;

-- Check for any pending challenges that should have been sent
SELECT * FROM app_scheduled_challenges 
WHERE status = 'pending' 
AND scheduled_time <= NOW()
ORDER BY scheduled_time;
