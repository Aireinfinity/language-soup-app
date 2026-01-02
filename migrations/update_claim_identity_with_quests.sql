-- Run this in Supabase SQL Editor to update the claim_user_identity function
-- This adds quest migration to prevent quest progress loss

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
  -- 1. Get Authentication
  new_user_id := auth.uid();
  IF new_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  -- 2. Check for existing "Ghost" (Orphan) Profile
  SELECT id INTO old_user_id
  FROM app_users
  WHERE display_name ILIKE target_display_name
    AND id != new_user_id
    AND emoji_password IS NULL
  LIMIT 1;

  -- 3. HANDLE GHOST (If found)
  IF old_user_id IS NOT NULL THEN
    -- A. Rename Ghost immediately
    UPDATE app_users 
    SET display_name = target_display_name || ' (archived_' || substr(old_user_id::text, 1, 4) || ')' 
    WHERE id = old_user_id;
  END IF;

  -- 4. CREATE NEW USER PROFILE (Upsert)
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
    display_name = EXCLUDED.display_name,
    emoji_password = EXCLUDED.emoji_password,
    updated_at = NOW();

  -- 5. MIGRATE DATA (If Ghost existed)
  IF old_user_id IS NOT NULL THEN
    -- Messages
    UPDATE app_messages SET sender_id = new_user_id WHERE sender_id = old_user_id;
    GET DIAGNOSTICS migrated_messages = ROW_COUNT;

    -- Groups
    UPDATE app_group_members
    SET user_id = new_user_id
    WHERE user_id = old_user_id
    AND group_id NOT IN (SELECT group_id FROM app_group_members WHERE user_id = new_user_id);
    GET DIAGNOSTICS migrated_groups = ROW_COUNT;

    -- Support
    UPDATE app_support_messages SET user_id = new_user_id WHERE user_id = old_user_id;

    -- Challenges
    UPDATE app_challenges SET created_by = new_user_id WHERE created_by = old_user_id;

    -- Quests (preserve quest progress)
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
