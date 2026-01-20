-- FORCE ENABLE notifications for users who have a token but might be set to false
-- This updates EXISTING records (which the previous INSERT skipped)

UPDATE app_notification_preferences
SET 
    push_enabled = true,
    new_challenges = true,
    new_messages = true,
    support_replies = true
FROM app_push_tokens
WHERE app_notification_preferences.user_id = app_push_tokens.user_id;

-- Verify the result
SELECT count(*) as users_enabled FROM app_notification_preferences WHERE push_enabled = true;
