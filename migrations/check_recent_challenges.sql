-- Check the most recent challenge and what created_by value it has
SELECT 
    id,
    group_id,
    prompt_text,
    created_by,
    created_at
FROM app_challenges
ORDER BY created_at DESC
LIMIT 5;
