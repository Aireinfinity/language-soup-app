-- CHECK_TOMORROWS_CHALLENGE.sql
-- This script looks for any APPROVED challenges scheduled for tomorrow (Jan 15th).

SELECT 
    id,
    status,
    scheduled_time AT TIME ZONE 'UTC' as scheduled_time_utc,
    challenge_text
FROM app_scheduled_challenges
WHERE status = 'approved'
AND scheduled_time >= '2026-01-15 00:00:00+00'
AND scheduled_time < '2026-01-16 00:00:00+00'
ORDER BY scheduled_time ASC;
