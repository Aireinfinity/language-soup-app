-- 🔎 EVA (AVA) DEEP AUDIT
-- 1. Check if she has multiple accounts
SELECT id, email, display_name, created_at 
FROM users 
WHERE email ILIKE (SELECT email FROM users WHERE id = '26d90cc6-2d3e-43ca-bf71-60f51dbf3e44')
OR display_name ILIKE '%Eva%' OR display_name ILIKE '%Ava%';

-- 2. Check if a challenge was actually sent to her group today
SELECT 
    g.name as group_name,
    c.prompt_text,
    c.created_at
FROM app_challenges c
JOIN app_groups g ON c.group_id = g.id
WHERE g.id = '85980403-acdd-4d92-b3b9-43d1fc2c2558' -- Her French group
AND c.created_at > NOW() - interval '24 hours';

-- 3. Check her token one more time
SELECT * FROM app_push_tokens WHERE user_id = '26d90cc6-2d3e-43ca-bf71-60f51dbf3e44';
