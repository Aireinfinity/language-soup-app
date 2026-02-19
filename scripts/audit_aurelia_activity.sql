-- Audit: what have both Aurelia accounts done? (current vs archived)
-- Run in Supabase SQL Editor. Shows message counts and speaking stats per profile.
-- If messages are still on the archived id, run the "migrate messages" block at the end.

WITH aurelias AS (
  SELECT id, display_name,
    (SELECT COUNT(*) FROM app_messages m WHERE m.sender_id = app_users.id) AS message_count,
    (SELECT COUNT(*) FROM app_messages m WHERE m.sender_id = app_users.id AND m.message_type = 'voice') AS voice_count,
    (SELECT COALESCE(SUM(duration_seconds), 0) FROM app_messages m WHERE m.sender_id = app_users.id AND m.message_type = 'voice') AS total_voice_seconds,
    (SELECT MAX(created_at) FROM app_messages m WHERE m.sender_id = app_users.id) AS last_message_at
  FROM app_users
  WHERE display_name = 'Aurelia' OR display_name ILIKE 'Aurelia (archived_%'
)
SELECT
  id,
  display_name,
  message_count,
  voice_count,
  total_voice_seconds,
  ROUND(total_voice_seconds::numeric / 60, 1) AS voice_minutes,
  last_message_at
FROM aurelias
ORDER BY display_name;

-- Optional: get_user_stats for each (same numbers the app uses for levels)
-- SELECT display_name, get_user_stats(id) FROM app_users WHERE display_name = 'Aurelia' OR display_name ILIKE 'Aurelia (archived_%');

-- If the ARCHIVED row has message_count > 0 and the current "Aurelia" has 0, run this once
-- to move those messages to the current account (replace CURRENT_AURELIA_ID and ARCHIVED_AURELIA_ID):
--
-- UPDATE app_messages SET sender_id = 'CURRENT_AURELIA_ID' WHERE sender_id = 'ARCHIVED_AURELIA_ID';
-- UPDATE app_group_members SET user_id = 'CURRENT_AURELIA_ID' WHERE user_id = 'ARCHIVED_AURELIA_ID'
--   AND group_id NOT IN (SELECT group_id FROM app_group_members WHERE user_id = 'CURRENT_AURELIA_ID');
-- UPDATE app_support_messages SET user_id = 'CURRENT_AURELIA_ID' WHERE user_id = 'ARCHIVED_AURELIA_ID';
-- UPDATE app_challenges SET created_by = 'CURRENT_AURELIA_ID' WHERE created_by = 'ARCHIVED_AURELIA_ID';
-- UPDATE app_scheduled_challenges SET created_by = 'CURRENT_AURELIA_ID' WHERE created_by = 'ARCHIVED_AURELIA_ID';
-- INSERT INTO app_user_quests (user_id, quest_id, completed_at, seen_celebration)
-- SELECT 'CURRENT_AURELIA_ID', quest_id, completed_at, seen_celebration FROM app_user_quests WHERE user_id = 'ARCHIVED_AURELIA_ID'
-- ON CONFLICT (user_id, quest_id) DO NOTHING;
