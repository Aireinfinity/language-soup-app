-- Check what share links exist in the database
SELECT 
    cs.share_link_id,
    cs.sharer_user_id,
    u.display_name as sharer_name,
    cs.created_at,
    cs.expires_at,
    (cs.expires_at < NOW()) as is_expired
FROM challenge_shares cs
JOIN app_users u ON cs.sharer_user_id = u.id
ORDER BY cs.created_at DESC
LIMIT 20;

-- Delete any test share links (if Hamza's user exists)
-- First, find Hamza's user ID
SELECT id, display_name FROM app_users WHERE display_name ILIKE '%hamza%';

-- Then delete his share links (replace USER_ID with actual ID)
-- DELETE FROM challenge_shares WHERE sharer_user_id = 'USER_ID';
