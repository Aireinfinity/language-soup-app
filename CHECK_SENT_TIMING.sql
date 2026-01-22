-- 🔎 WHEN WAS THE LAST CHALLENGE SENT?
SELECT 
    id, 
    challenge_text, 
    status, 
    scheduled_time, 
    updated_at as processed_at
FROM app_scheduled_challenges
WHERE status = 'sent'
ORDER BY updated_at DESC
LIMIT 5;
