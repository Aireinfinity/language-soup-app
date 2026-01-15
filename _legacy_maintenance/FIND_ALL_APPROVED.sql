-- FIND_ALL_APPROVED.sql
-- Let's see every challenge that is marked as 'approved' and when it is scheduled.

SELECT 
    id, 
    status, 
    scheduled_time AT TIME ZONE 'UTC' as scheduled_time_utc, 
    challenge_text 
FROM app_scheduled_challenges 
WHERE status = 'approved'
ORDER BY scheduled_time ASC;
