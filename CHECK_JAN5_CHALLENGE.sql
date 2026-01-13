-- Check the actual Jan 5th challenge in the database

-- Look at challenges sent on Jan 5th
SELECT 
    id,
    group_id,
    prompt_text,
    created_at,
    created_by
FROM app_challenges
WHERE created_at::date = '2026-01-05'
AND prompt_text LIKE '%2025%'  -- The challenge about 2025 goals
ORDER BY created_at
LIMIT 10;

-- Also check messages from Jan 5th
SELECT 
    id,
    group_id,
    content,
    created_at,
    sender_id
FROM app_messages
WHERE created_at::date = '2026-01-05'
AND content LIKE '%2025%'
ORDER BY created_at
LIMIT 10;
