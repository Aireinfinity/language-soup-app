-- SET_CELEBRITY_FOR_TOMORROW.sql
-- 1. Move the 'Celebrity' challenge to tomorrow (Jan 15) at 7:59 PM.
UPDATE app_scheduled_challenges
SET scheduled_time = '2026-01-15 18:59:00+00', -- Tomorrow
    status = 'approved'
WHERE id = '42280b3a-d9d8-412a-828f-4e6db558164e';

-- 2. VERIFY: Show what is now at the top of the queue for sending.
SELECT 
    id,
    status,
    scheduled_time,
    challenge_text,
    CASE 
        WHEN status = 'approved' THEN '✅ WILL SEND TOMORROW'
        ELSE '❌ Skipping (Pending)'
    END as status_check
FROM app_scheduled_challenges
WHERE scheduled_time > NOW()
ORDER BY scheduled_time ASC
LIMIT 1;
