-- PRE-FLIGHT CHECK ✈️
-- Run this AFTER you click "Approve" but BEFORE the minute hits.
-- It tells you if the system is "Armed and Ready".

SELECT 
    id, 
    challenge_text, 
    scheduled_time, 
    status,
    NOW() as current_server_time,
    CASE 
        WHEN status = 'approved' AND scheduled_time > NOW() THEN 'WAITING ⏳'
        WHEN status = 'approved' AND scheduled_time <= NOW() THEN 'READY TO FIRE 🟢'
        ELSE 'NOT READY 🔴'
    END as system_status
FROM app_scheduled_challenges
WHERE status = 'approved' -- Filter for only approved ones to reduce noise
ORDER BY created_at DESC -- Show the one you JUST made
LIMIT 1;

-- It should say "WAITING" if you scheduled it for the future.
-- As soon as the time passes, it flips to "READY TO FIRE".
