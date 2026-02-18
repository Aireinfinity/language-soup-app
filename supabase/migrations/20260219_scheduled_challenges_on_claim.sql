-- When claiming/archiving a profile, reassign app_scheduled_challenges to the new user
-- so the dashboard queue (approved/pending challenges) is not lost.
-- Fixes: "no challenges queued" after archiving Noah (or any) profiles.

CREATE OR REPLACE FUNCTION claim_user_identity(
  target_display_name TEXT,
  target_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  new_user_id UUID;
  old_user_id UUID;
  migrated_messages INT := 0;
  migrated_groups INT := 0;
BEGIN
  new_user_id := auth.uid();
  IF new_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  SELECT id INTO old_user_id
  FROM app_users
  WHERE display_name ILIKE target_display_name
    AND id != new_user_id
    AND emoji_password IS NULL
  LIMIT 1;

  IF old_user_id IS NOT NULL THEN
    UPDATE app_users
    SET display_name = target_display_name || ' (archived_' || substr(old_user_id::text, 1, 4) || ')'
    WHERE id = old_user_id;
  END IF;

  INSERT INTO app_users (id, display_name, emoji_password, status_text, is_admin, is_community_manager, created_at, updated_at)
  VALUES (
    new_user_id,
    target_display_name,
    target_password,
    'Hey there! I am using Language Soup',
    (target_display_name = 'Noah :)'),
    (target_display_name = 'Noah :)'),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = COALESCE(
      NULLIF(EXCLUDED.display_name, 'Anonymous'),
      NULLIF(EXCLUDED.display_name, 'Anonymous Souper'),
      app_users.display_name,
      EXCLUDED.display_name
    ),
    emoji_password = COALESCE(NULLIF(TRIM(app_users.emoji_password), ''), EXCLUDED.emoji_password),
    updated_at = NOW();

  IF old_user_id IS NOT NULL THEN
    UPDATE app_messages SET sender_id = new_user_id WHERE sender_id = old_user_id;
    GET DIAGNOSTICS migrated_messages = ROW_COUNT;
    UPDATE app_group_members
    SET user_id = new_user_id
    WHERE user_id = old_user_id
    AND group_id NOT IN (SELECT group_id FROM app_group_members WHERE user_id = new_user_id);
    GET DIAGNOSTICS migrated_groups = ROW_COUNT;
    UPDATE app_support_messages SET user_id = new_user_id WHERE user_id = old_user_id;
    UPDATE app_challenges SET created_by = new_user_id WHERE created_by = old_user_id;
    UPDATE app_scheduled_challenges SET created_by = new_user_id WHERE created_by = old_user_id;
    INSERT INTO app_user_quests (user_id, quest_id, completed_at, seen_celebration)
    SELECT new_user_id, quest_id, completed_at, seen_celebration
    FROM app_user_quests
    WHERE user_id = old_user_id
    ON CONFLICT (user_id, quest_id) DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'status', 'success',
    'claimed_ghost', (old_user_id IS NOT NULL),
    'new_id', new_user_id,
    'migrated_items', migrated_messages + migrated_groups
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION claim_user_identity(TEXT, TEXT) IS 'Claim or create app_users row. Never overwrites existing emoji_password. Migrates app_scheduled_challenges so dashboard queue is not lost.';
