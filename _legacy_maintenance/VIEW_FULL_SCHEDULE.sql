-- VIEW_FULL_SCHEDULE.sql
-- This shows your next 5 challenges so we can find exactly what you are looking for.

SELECT 
    id,
    status,
    scheduled_time AT TIME ZONE 'UTC' as scheduled_time_utc,
    challenge_text
FROM app_scheduled_challenges
WHERE scheduled_time >= CURRENT_DATE
ORDER BY scheduled_time ASC
LIMIT 5;
