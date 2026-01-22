-- 1. Check if Ava has multiple tokens (often happens with old accounts)
-- If she has 2+, the system might be picking the old one at random.
SELECT 
    user_id, 
    expo_push_token, 
    platform, 
    updated_at,
    created_at
FROM app_push_tokens 
WHERE user_id = '26d90cc6-2d3e-43ca-bf71-60f51dbf3e44'
ORDER BY updated_at DESC;

-- 2. Check if she is in any of the EXCLUDED test groups
-- Our PROD function ignores these IDs:
-- '439ffe03-96fa-41d3-96f1-c0a8a779ce9d' (noah's test group solo)
-- 'a34c1008-72ea-4dbb-a605-6673f6c5f6b3' (app testers)
SELECT 
    gm.group_id,
    g.name as group_name,
    CASE 
        WHEN gm.group_id IN ('439ffe03-96fa-41d3-96f1-c0a8a779ce9d', 'a34c1008-72ea-4dbb-a605-6673f6c5f6b3') THEN '❌ EXCLUDED (Test Group)'
        ELSE '✅ INCLUDED'
    END as status
FROM app_group_members gm
JOIN app_groups g ON gm.group_id = g.id
WHERE gm.user_id = '26d90cc6-2d3e-43ca-bf71-60f51dbf3e44';
