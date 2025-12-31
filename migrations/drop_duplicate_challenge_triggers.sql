-- Drop the trigger that creates duplicate system messages
DROP TRIGGER IF EXISTS on_challenge_created ON app_challenges;
DROP FUNCTION IF EXISTS handle_new_challenge();

-- Drop the trigger that sends notifications (we will do this from JS for better reliability)
DROP TRIGGER IF EXISTS on_challenge_created_send_notification ON app_challenges;
DROP FUNCTION IF EXISTS trigger_challenge_push_notification();
