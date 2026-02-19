-- Power users group: create "power users 🔥" and auto-add the curated list (~20 people).
-- Run once in Supabase SQL Editor. Paste the ENTIRE file and run (do not run only part of it).
-- avatar_url = 'emoji:🔥' shows 🔥 as the chat icon in the app.

DO $powerusers$
DECLARE
  gid uuid;
  added int;
  gname text := 'power users 🔥';
  gdesc text := 'first users to test new features and updates!';
  gavatar text := 'emoji:🔥';
BEGIN
  SELECT id INTO gid FROM app_groups WHERE name IN (gname, 'Power users') LIMIT 1;
  IF gid IS NULL THEN
    INSERT INTO app_groups (name, language, description, is_visible, member_count, avatar_url)
    VALUES (gname, 'English', gdesc, false, 0, gavatar)
    RETURNING id INTO gid;
    RAISE NOTICE 'Created group (%)', gid;
  ELSE
    UPDATE app_groups SET name = gname, description = gdesc, avatar_url = gavatar WHERE id = gid;
    RAISE NOTICE 'Updated existing group (%)', gid;
  END IF;

  INSERT INTO app_group_members (user_id, group_id, role)
  SELECT u.id, gid, 'member'
  FROM app_users u
  WHERE u.display_name IN (
    'Noah', 'Miranda', 'Karen', 'Johnny', 'johnny', 'Eva', 'Bridget', 'Eryn',
    'Christian', 'Scarlett', 'Abby', 'Felipe', 'felipe', 'Babka', 'BabkaZs',
    'Diana', 'Ava', 'CJ', 'Ruby', 'Aurelia', 'Nicki', 'Josiah', 'Oshack', 'Adora',
    'Aidan', 'hamza', 'Hamza'
  )
  ON CONFLICT (user_id, group_id) DO NOTHING;

  GET DIAGNOSTICS added = ROW_COUNT;
  RAISE NOTICE 'Added % members (existing skipped).', added;

  UPDATE app_groups
  SET member_count = (SELECT COUNT(*) FROM app_group_members WHERE group_id = gid)
  WHERE id = gid;
END $powerusers$;

-- Optional: show who's in the group
-- SELECT u.display_name, gm.role, gm.joined_at
-- FROM app_group_members gm
-- JOIN app_users u ON u.id = gm.user_id
-- JOIN app_groups g ON g.id = gm.group_id
-- WHERE g.name = 'power users 🔥'
-- ORDER BY gm.joined_at;
