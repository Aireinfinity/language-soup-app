-- EMERGENCY STOP: Unschedule EVERYTHING to stop the bleeding
SELECT cron.unschedule(jobid) FROM cron.job;

-- DIAGNOSTICS: Why 74?
-- 1. How many groups are there?
SELECT COUNT(*) as total_groups FROM app_groups;

-- 2. How many groups is the user in? (Replace with your user ID if known, or just list counts)
SELECT user_id, COUNT(*) as group_count 
FROM app_group_members 
GROUP BY user_id 
ORDER BY group_count DESC 
LIMIT 5;

-- 3. Did we create 74 challenges?
SELECT count(*) as recent_challenges 
FROM app_challenges 
WHERE created_at > NOW() - INTERVAL '10 minutes';
