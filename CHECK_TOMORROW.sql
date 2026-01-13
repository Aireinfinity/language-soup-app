-- CHECK TOMORROW
-- Verify your upcoming challenge is ready and waiting.

SELECT 
    id,
    challenge_text,
    status,
    scheduled_time as "Target_Time_UTC",
    NOW() as "Server_Current_Time_UTC",
    (scheduled_time - NOW()) as "Time_Until_Launch"
FROM app_scheduled_challenges
WHERE scheduled_time > NOW()
ORDER BY scheduled_time ASC
LIMIT 1;
