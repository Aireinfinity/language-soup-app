-- 🔎 WHERE ARE THE OTHER 25 USERS?
-- We thought we had 119, but the summary says 94.

-- 1. Total tokens in the table vs Linked tokens
SELECT 
    'Total Tokens in Table' as check, COUNT(*) FROM app_push_tokens
UNION ALL
SELECT 
    'Tokens linked to app_users', COUNT(DISTINCT t.user_id) 
    FROM app_push_tokens t
    JOIN app_users u ON t.user_id = u.id
UNION ALL
SELECT 
    'Tokens in a VALID Group', COUNT(DISTINCT t.user_id)
    FROM app_push_tokens t
    JOIN app_group_members gm ON t.user_id = gm.user_id
    WHERE gm.group_id NOT IN ('439ffe03-96fa-41d3-96f1-c0a8a779ce9d', 'a34c1008-72ea-4dbb-a605-6673f6c5f6b3');

-- 2. Find Eva's current position in the RAW table
-- (Maybe the group join is filtering her out?)
SELECT 
    u.display_name,
    t.updated_at,
    (SELECT COUNT(*) FROM app_group_members WHERE user_id = u.id) as group_count
FROM app_push_tokens t
JOIN app_users u ON t.user_id = u.id
WHERE u.id = '00743f8e-b2a3-440b-b3ed-f222f81a8b86';

-- 3. Check for users with tokens NOT in any group
SELECT u.display_name, u.id
FROM app_push_tokens t
JOIN app_users u ON t.user_id = u.id
LEFT JOIN app_group_members gm ON u.id = gm.user_id
WHERE gm.user_id IS NULL;
