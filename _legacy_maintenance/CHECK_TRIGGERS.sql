-- Check if the spammy trigger exists
SELECT tgname, tgenabled, tgrelid::regclass 
FROM pg_trigger 
WHERE tgname IN ('trigger_notify_new_challenge', 'trigger_notify_challenge_sent');
