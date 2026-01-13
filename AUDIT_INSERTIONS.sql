-- AUDIT INSERTIONS
-- Did we insert 1 row (Solo) or 7 rows (All Groups)?

SELECT 
    c.id, 
    c.created_at, 
    g.name as group_name, 
    c.prompt_text
FROM app_challenges c
JOIN app_groups g ON c.group_id = g.id
WHERE c.created_at > NOW() - interval '30 minutes'
ORDER BY c.created_at DESC;
