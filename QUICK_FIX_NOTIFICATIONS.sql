-- Quick fix for users who have a push token but no notification preferences (e.g. old users)
-- This will insert a default "TRUE" preference record for anyone missing one.

INSERT INTO app_notification_preferences (
    user_id, 
    push_enabled, 
    new_challenges, 
    new_messages, 
    support_replies
)
SELECT 
    apt.user_id,
    true, -- Default to enabled
    true,
    true,
    true
FROM app_push_tokens apt
LEFT JOIN app_notification_preferences anp ON apt.user_id = anp.user_id
WHERE anp.user_id IS NULL;

-- Optional: Verify it worked by counting how many have preferences now
SELECT count(*) as count_with_prefs FROM app_notification_preferences;
