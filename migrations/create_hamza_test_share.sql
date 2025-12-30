-- Create test share link using Hamza's response to "when do you feel the most like yourself"
-- Run this in Supabase SQL Editor

-- Step 1: Find Hamza's response to that challenge
SELECT 
    m.id as message_id,
    m.sender_id,
    m.group_id,
    m.content,
    m.audio_url,
    m.created_at,
    u.display_name as sender_name,
    g.name as group_name,
    g.language,
    g.level
FROM app_messages m
JOIN app_users u ON m.sender_id = u.id
JOIN app_groups g ON m.group_id = g.id
WHERE u.display_name ILIKE '%hamza%'
  AND m.message_type = 'voice'
ORDER BY m.created_at DESC
LIMIT 10;

-- Step 2: Once you find the right message, create the share link
-- Replace the IDs below with the actual ones from Step 1

INSERT INTO challenge_shares (
    sharer_user_id,
    group_id,
    challenge_message_id,
    share_link_id
) 
SELECT 
    m.sender_id,
    m.group_id,
    m.id,
    'hamza123'
FROM app_messages m
JOIN app_users u ON m.sender_id = u.id
WHERE u.display_name ILIKE '%hamza%'
  AND m.message_type = 'voice'
ORDER BY m.created_at DESC
LIMIT 1;

-- Step 3: Verify it worked
SELECT * FROM get_challenge_share('hamza123');

-- If the above doesn't work (no Hamza found), use this fallback:
-- This will use ANY recent voice message as a test

/*
INSERT INTO challenge_shares (
    sharer_user_id,
    group_id,
    challenge_message_id,
    share_link_id
)
SELECT 
    sender_id,
    group_id,
    id,
    'test123'
FROM app_messages
WHERE message_type = 'voice'
ORDER BY created_at DESC
LIMIT 1;

SELECT * FROM get_challenge_share('test123');
*/
