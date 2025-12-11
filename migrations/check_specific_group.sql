-- ============================================
-- Check specific group messages and their senders
-- ============================================

SELECT 
    m.id,
    m.content,
    m.created_at,
    m.sender_id,
    m.message_type,
    u.display_name as sender_name,
    u.id as user_exists
FROM app_messages m
LEFT JOIN app_users u ON u.id = m.sender_id
WHERE m.group_id = 'a34c1008-72ea-4dbb-a605-6673f6c5f6b3'
ORDER BY m.created_at ASC;

-- This will show if any messages have NULL sender_name (orphaned messages)
