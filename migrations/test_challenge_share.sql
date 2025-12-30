-- Test Data for Challenge Sharing Feature
-- Run this in Supabase SQL Editor to create test share link

-- First, let's find a real voice message from your database
-- Replace these IDs with actual ones from your database

-- Step 1: Find a voice message (run this first to get IDs)
SELECT 
    m.id as message_id,
    m.sender_id,
    m.group_id,
    m.content,
    m.audio_url,
    u.display_name as sender_name,
    g.name as group_name,
    g.language,
    g.level
FROM app_messages m
JOIN app_users u ON m.sender_id = u.id
JOIN app_groups g ON m.group_id = g.id
WHERE m.message_type = 'voice'
ORDER BY m.created_at DESC
LIMIT 5;

-- Step 2: Create a test share (replace the UUIDs with real ones from above)
-- Example:
/*
INSERT INTO challenge_shares (
    sharer_user_id,
    group_id,
    challenge_message_id,
    share_link_id
) VALUES (
    'YOUR_USER_ID_HERE',
    'YOUR_GROUP_ID_HERE', 
    'YOUR_MESSAGE_ID_HERE',
    'test123'
);
*/

-- Step 3: Test the RPC function
-- SELECT * FROM get_challenge_share('test123');

-- Step 4: If you want to create a completely fake test:
-- (Only use this if you don't have real data yet)
/*
INSERT INTO challenge_shares (
    sharer_user_id,
    group_id,
    challenge_message_id,
    share_link_id,
    created_at,
    expires_at
) VALUES (
    (SELECT id FROM app_users WHERE display_name = 'Noah :)' LIMIT 1),
    (SELECT id FROM app_groups LIMIT 1),
    (SELECT id FROM app_messages WHERE message_type = 'voice' LIMIT 1),
    'test123',
    NOW(),
    NOW() + INTERVAL '2 hours'
);
*/
