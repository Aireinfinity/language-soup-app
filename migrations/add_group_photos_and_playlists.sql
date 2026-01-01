-- Add group_photo_url and spotify_playlist_url to app_groups table
ALTER TABLE app_groups 
ADD COLUMN IF NOT EXISTS group_photo_url TEXT,
ADD COLUMN IF NOT EXISTS spotify_playlist_url TEXT;

-- Update French group with playlist
UPDATE app_groups 
SET spotify_playlist_url = 'https://open.spotify.com/playlist/7ip1fGHnn8XXSUOTiJrYRN?si=5863d3cee298466e&pt=4bfbc6dfdf801c004b9c4edccc941900'
WHERE language ILIKE '%french%' OR name ILIKE '%french%';
