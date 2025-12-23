-- Update existing native speaker profiles with current user data from app_users
-- This fixes profiles that show "Anonymous" by pulling real display_name and avatar_url

UPDATE app_native_speakers ns
SET 
    display_name = COALESCE(u.display_name, ns.display_name),
    photo_url = COALESCE(u.avatar_url, ns.photo_url)
FROM app_users u
WHERE ns.user_id = u.id
  AND (ns.display_name = 'Anonymous' OR ns.display_name IS NULL OR ns.photo_url IS NULL);

-- Verify the update
SELECT 
    ns.id,
    ns.display_name,
    ns.photo_url,
    u.display_name as user_display_name,
    u.avatar_url as user_avatar_url
FROM app_native_speakers ns
JOIN app_users u ON ns.user_id = u.id
LIMIT 10;
