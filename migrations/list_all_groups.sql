-- ============================================
-- List all groups with their IDs and message counts
-- ============================================

SELECT 
    g.id as group_id,
    g.name as group_name,
    g.language,
    COUNT(m.id) as message_count,
    MIN(m.created_at) as oldest_message,
    MAX(m.created_at) as newest_message
FROM app_groups g
LEFT JOIN app_messages m ON m.group_id = g.id
GROUP BY g.id, g.name, g.language
ORDER BY message_count DESC;
