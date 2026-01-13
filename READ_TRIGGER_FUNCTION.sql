-- READ TRIGGER FUNCTION
-- Let's see what the legacy notification logic actually does.

SELECT pg_get_functiondef('trigger_challenge_push_notification'::regproc);
