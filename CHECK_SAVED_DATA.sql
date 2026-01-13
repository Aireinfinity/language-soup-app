-- CHECK SAVED DATA
SELECT id, challenge_text, translations, status
FROM app_scheduled_challenges
ORDER BY created_at DESC
LIMIT 1;
