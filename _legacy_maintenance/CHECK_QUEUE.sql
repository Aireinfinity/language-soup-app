-- CHECK_QUEUE.sql
-- Let's see exactly what is scheduled for the future.

SELECT 
    id, 
    status, 
    scheduled_time, 
    challenge_text 
FROM app_scheduled_challenges 
WHERE scheduled_time > NOW()
ORDER BY scheduled_time ASC;
