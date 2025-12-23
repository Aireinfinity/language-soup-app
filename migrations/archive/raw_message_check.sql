-- ============================================
-- Raw message check (no joins, no filters)
-- This bypasses RLS completely (admin view)
-- ============================================

-- See ALL 3 messages raw
SELECT 
    id,
    content,
    created_at,
    sender_id,
    message_type,
    group_id
FROM app_messages
WHERE group_id = 'a34c1008-72ea-4dbb-a605-6673f6c5f6b3'
ORDER BY created_at ASC;

-- Count by sender_id
SELECT 
    sender_id,
    COUNT(*) as message_count
FROM app_messages
WHERE group_id = 'a34c1008-72ea-4dbb-a605-6673f6c5f6b3'
GROUP BY sender_id;
