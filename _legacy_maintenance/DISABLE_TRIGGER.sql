-- DISABLE TRIGGER 🔇
-- This stops the Database from "Helping" (and causing double notifications).

DROP TRIGGER IF EXISTS on_challenge_created_send_notification ON app_challenges;
DROP TRIGGER IF EXISTS on_challenge_created ON app_challenges;

-- Verify it's gone
SELECT trigger_name 
FROM information_schema.triggers 
WHERE event_object_table = 'app_challenges';
