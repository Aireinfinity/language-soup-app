-- Add Noah to "app testers" and "Noah's test group solo" so they show under Your Groups.
-- Run in Supabase SQL Editor. Safe to run multiple times (ON CONFLICT DO NOTHING).

-- 1) Check which groups Noah is currently in (optional)
-- SELECT g.name FROM app_groups g
-- JOIN app_group_members m ON m.group_id = g.id
-- JOIN app_users u ON u.id = m.user_id
-- WHERE u.display_name = 'Noah'
-- ORDER BY g.name;

-- 2) Add Noah to these groups if not already a member
INSERT INTO app_group_members (user_id, group_id, role)
SELECT u.id, g.id, 'member'
FROM app_users u
CROSS JOIN app_groups g
WHERE u.display_name = 'Noah'
  AND g.name IN ('app testers', 'Noah''s test group solo')
ON CONFLICT (user_id, group_id) DO NOTHING;

-- 3) Update member_count for those groups (in case trigger is missing)
UPDATE app_groups g
SET member_count = (SELECT COUNT(*) FROM app_group_members WHERE group_id = g.id)
WHERE g.name IN ('app testers', 'Noah''s test group solo');
