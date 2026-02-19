-- One-off: move all activity from archived Aurelia to current Aurelia.
-- Run this ONLY if the audit shows messages/stats on the archived row and none on current.
-- Resolves ids by display_name so no need to paste UUIDs.

DO $$
DECLARE
  curr_id UUID;
  arch_id UUID;
  msg_rows INT;
  gm_rows INT;
BEGIN
  SELECT id INTO curr_id FROM app_users WHERE display_name = 'Aurelia' LIMIT 1;
  SELECT id INTO arch_id FROM app_users WHERE display_name ILIKE 'Aurelia (archived_%' LIMIT 1;

  IF curr_id IS NULL OR arch_id IS NULL OR curr_id = arch_id THEN
    RAISE NOTICE 'Need both current Aurelia and archived row. curr_id=% arch_id=%', curr_id, arch_id;
    RETURN;
  END IF;

  UPDATE app_messages SET sender_id = curr_id WHERE sender_id = arch_id;
  GET DIAGNOSTICS msg_rows = ROW_COUNT;
  RAISE NOTICE 'app_messages: % rows updated', msg_rows;

  UPDATE app_group_members SET user_id = curr_id
  WHERE user_id = arch_id
    AND group_id NOT IN (SELECT group_id FROM app_group_members WHERE user_id = curr_id);
  GET DIAGNOSTICS gm_rows = ROW_COUNT;
  RAISE NOTICE 'app_group_members: % rows updated', gm_rows;

  UPDATE app_support_messages SET user_id = curr_id WHERE user_id = arch_id;
  UPDATE app_challenges SET created_by = curr_id WHERE created_by = arch_id;
  UPDATE app_scheduled_challenges SET created_by = curr_id WHERE created_by = arch_id;
  INSERT INTO app_user_quests (user_id, quest_id, completed_at, seen_celebration)
  SELECT curr_id, quest_id, completed_at, seen_celebration FROM app_user_quests WHERE user_id = arch_id
  ON CONFLICT (user_id, quest_id) DO NOTHING;
END $$;
