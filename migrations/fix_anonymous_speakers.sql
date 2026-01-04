-- Fix existing "Anonymous" profiles in app_native_speakers
-- This updates the display_name and photo_url from the main app_users table

UPDATE app_native_speakers ans
SET 
    display_name = au.display_name,
    photo_url = au.avatar_url
FROM app_users au
WHERE ans.user_id = au.id
  AND (ans.display_name = 'Anonymous' OR ans.display_name IS NULL);

-- Optional: Verify the changes
-- SELECT id, display_name, photo_url FROM app_native_speakers;
