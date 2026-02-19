-- Prevent "new account with same name" from archiving an existing account that has no emoji password.
-- If someone with that name already exists but emoji_password IS NULL, do NOT archive them.
-- Return ACCOUNT_EXISTS_NO_PASSWORD so the app can tell the user to contact Noah instead of creating a duplicate.
-- Reduces lockouts like Aurelia's (new account archived the old one; old had no password set).

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

  -- Do NOT archive or replace: existing account has no password; user should recover it via Noah
  IF old_user_id IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'ACCOUNT_EXISTS_NO_PASSWORD');
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

  RETURN jsonb_build_object(
    'status', 'success',
    'claimed_ghost', FALSE,
    'new_id', new_user_id,
    'migrated_items', 0
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION claim_user_identity(TEXT, TEXT) IS 'Claim or create app_users row. Never overwrites existing emoji_password. Does not archive existing same-name account when it has no emoji password (returns ACCOUNT_EXISTS_NO_PASSWORD).';
