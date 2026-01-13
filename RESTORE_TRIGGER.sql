-- RESTORE TRIGGER (UNDO BUTTON) ↩️
-- Run this ONLY if you want to bring back the double-notifications.

CREATE TRIGGER on_challenge_created_send_notification
AFTER INSERT ON app_challenges
FOR EACH ROW
EXECUTE FUNCTION trigger_challenge_push_notification();

SELECT 'Trigger Restored' as status;
