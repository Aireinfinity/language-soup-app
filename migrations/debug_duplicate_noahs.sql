-- Find all Noah profiles and recent challenge messages
-- This will help us understand the duplicate profile issue

-- 1. Find all users with "noah" in their name
SELECT 
    id,
    display_name,
    avatar_url,
    is_admin,
    created_at,
    updated_at
FROM app_users
WHERE LOWER(display_name) LIKE '%noah%'
ORDER BY created_at DESC;

-- 2. Check recent challenge messages to see who's sending them
SELECT 
    m.id as message_id,
    m.sender_id,
    u.display_name as sender_name,
    m.group_id,
    m.content,
    m.created_at,
    m.challenge_id
FROM app_messages m
LEFT JOIN app_users u ON m.sender_id = u.id
WHERE m.content LIKE '#challenge%'
ORDER BY m.created_at DESC
LIMIT 10;

-- 3. Check for duplicate messages (same challenge_id appearing multiple times)
SELECT 
    challenge_id,
    COUNT(*) as message_count,
    array_agg(id) as message_ids,
    array_agg(sender_id) as sender_ids
FROM app_messages
WHERE challenge_id IS NOT NULL
GROUP BY challenge_id
HAVING COUNT(*) > 1
ORDER BY MAX(created_at) DESC;

-- 4. Check what triggers currently exist
SELECT 
    trigger_name,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'app_challenges';
