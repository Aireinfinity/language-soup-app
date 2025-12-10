-- Fix orphaned group member records
-- Run this to clean up the database after the previous cleanup

-- Delete ALL orphaned group member records (where user doesn't exist)
DELETE FROM app_group_members
WHERE user_id NOT IN (
    SELECT id FROM app_users
);

-- Verify no orphans remain
SELECT COUNT(*) as orphaned_records
FROM app_group_members gm
WHERE NOT EXISTS (
    SELECT 1 FROM app_users u WHERE u.id = gm.user_id
);

-- Update member counts to be accurate
UPDATE app_groups g
SET member_count = (
    SELECT COUNT(DISTINCT gm.user_id)
    FROM app_group_members gm
    WHERE gm.group_id = g.id
);

-- Show current state
SELECT 
    g.name,
    g.member_count as stored_count,
    COUNT(DISTINCT gm.user_id) as actual_count
FROM app_groups g
LEFT JOIN app_group_members gm ON g.id = gm.group_id
GROUP BY g.id, g.name, g.member_count
ORDER BY g.name;
