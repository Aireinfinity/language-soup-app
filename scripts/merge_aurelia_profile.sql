-- One-off: Merge Aurelia's archived profile into her current account.
-- She created a new account with the same name; claim_user_identity archived the old one
-- and migrated messages/groups to the new user. This copies the OLD profile's photo and
-- tagline onto the NEW (current) "Aurelia" so she keeps her avatar and status.
--
-- Run in Supabase SQL Editor. No need to replace IDs; it matches by display_name.
-- Current = display_name = 'Aurelia'. Old = display_name ILIKE 'Aurelia (archived_%'.

UPDATE app_users AS curr
SET
  avatar_url = COALESCE(archived.avatar_url, curr.avatar_url),
  status_text = COALESCE(NULLIF(TRIM(archived.status_text), ''), curr.status_text),
  bio = COALESCE(NULLIF(TRIM(archived.bio), ''), curr.bio),
  updated_at = NOW()
FROM (
  SELECT id, avatar_url, status_text, bio
  FROM app_users
  WHERE display_name ILIKE 'Aurelia (archived_%'
  LIMIT 1
) AS archived
WHERE curr.display_name = 'Aurelia'
  AND curr.id != archived.id;

-- Optional: see what changed
-- SELECT id, display_name, avatar_url, status_text FROM app_users WHERE display_name = 'Aurelia' OR display_name ILIKE 'Aurelia (archived_%');

-- Then set her emoji password (use the id from display_name = 'Aurelia', not the archived row):
-- 1) Get current Aurelia's id:  SELECT id FROM app_users WHERE display_name = 'Aurelia';
-- 2) From repo:  cd code/dashboard && node scripts/set-emoji-password.js <id-from-step-1> "Aurelia" "😭😭😭"
-- 3) Tell her: "Your password is 😭 😭 😭. Log in with your name and those three emojis."
