-- 🔍 Check Ava's Group Memberships
-- We need to see if she's in a group that actually gets challenges.
SELECT 
    g.id as group_id,
    g.name as group_name,
    g.language
FROM app_group_members gm
JOIN app_groups g ON gm.group_id = g.id
WHERE gm.user_id = '26d90cc6-2d3e-43ca-bf71-60f51dbf3e44';
