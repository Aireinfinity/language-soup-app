-- ============================================
-- Check if old messages actually exist
-- ============================================

-- 1. Count total messages in a specific group (replace with your group ID)
SELECT 
    group_id,
    COUNT(*) as total_messages,
    MIN(created_at) as oldest_message,
    MAX(created_at) as newest_message
FROM app_messages
WHERE group_id = 'YOUR_GROUP_ID_HERE'  -- Replace with actual group ID
GROUP BY group_id;

-- 2. Check all messages in ALL groups (first 50)
SELECT 
    id,
    group_id,
    sender_id,
    content,
    created_at,
    message_type
FROM app_messages
ORDER BY created_at DESC
LIMIT 50;

-- 3. Check if any messages exist from before today
SELECT COUNT(*) as old_message_count
FROM app_messages
WHERE created_at < CURRENT_DATE;
