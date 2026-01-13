-- FIX TIME FOR USER
-- Sets the NOAH TRANSLATE challenge to fire in exactly 2 minutes from NOW (Server Time).

UPDATE app_scheduled_challenges
SET scheduled_time = NOW() + interval '2 minutes',
    status = 'pending' -- Reset to pending so you can click Approve
WHERE challenge_text ILIKE '%NOAH TRANSLATE%';

-- Verify the new time
SELECT id, challenge_text, scheduled_time, NOW() as server_now 
FROM app_scheduled_challenges 
WHERE challenge_text ILIKE '%NOAH TRANSLATE%';
