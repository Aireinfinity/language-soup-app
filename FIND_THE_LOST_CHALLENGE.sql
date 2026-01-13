-- FIND THE LOST CHALLENGE
-- Looking specifically for the one you created.

SELECT 
    id, 
    challenge_text, 
    status, 
    scheduled_time, 
    NOW() as current_server_time,
    (scheduled_time - NOW()) as time_remaining
FROM app_scheduled_challenges
WHERE challenge_text ILIKE '%NOAH TRANSLATE%'
ORDER BY created_at DESC;
