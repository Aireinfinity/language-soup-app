-- 🔎 FINAL BATCHING VISUALIZER
-- This confirms how the 119 users will be sent tomorrow.

WITH all_tokens AS (
    SELECT 
        u.display_name,
        ROW_NUMBER() OVER (ORDER BY t.updated_at DESC) as position
    FROM app_push_tokens t
    JOIN app_users u ON t.user_id = u.id
    WHERE t.expo_push_token LIKE 'ExponentPushToken%'
    AND u.id IN (
        SELECT user_id FROM app_group_members 
        WHERE group_id NOT IN ('439ffe03-96fa-41d3-96f1-c0a8a779ce9d', 'a34c1008-72ea-4dbb-a605-6673f6c5f6b3')
    )
)
SELECT 
    position,
    display_name,
    CASE 
        WHEN position <= 100 THEN '📦 BATCH 1 (Users 1-100)'
        WHEN position <= 200 THEN '📦 BATCH 2 (Users 101-200)'
        ELSE '📦 BATCH 3+'
    END as delivery_batch
FROM all_tokens
WHERE display_name IN ('noah :)', 'Johnny', 'Eva Merrin :)')
ORDER BY position ASC;

-- Check if the function logic for batching is present
SELECT 
    CASE 
        WHEN routine_definition LIKE '%batch_count%' THEN '✅ BATCHING LOGIC DETECTED'
        ELSE '❌ OLD LOGIC STILL PRESENT'
    END as status,
    LENGTH(routine_definition) as code_size
FROM information_schema.routines 
WHERE routine_name = 'process_scheduled_challenges_prod';
