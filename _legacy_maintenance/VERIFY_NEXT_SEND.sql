-- VERIFY_NEXT_SEND.sql
-- This query shows EXACTLY which challenge the system will pick up next.

SELECT 
    id,
    status,
    scheduled_time,
    challenge_text,
    CASE 
        WHEN status = 'approved' THEN '✅ YES (Will Send)'
        ELSE '❌ NO (Needs Approval)'
    END as will_it_send
FROM app_scheduled_challenges
WHERE scheduled_time > NOW()
ORDER BY scheduled_time ASC
LIMIT 1;
