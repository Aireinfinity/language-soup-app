-- DRY RUN (SAFE CHECK) ⛑️
-- This does NOT delete anything.
-- It only shows you what WOULD be deleted.

WITH latest_tokens AS (
    SELECT DISTINCT ON (user_id) ctid
    FROM app_push_tokens
    ORDER BY user_id, created_at DESC
)
SELECT 
    t.user_id,
    t.created_at,
    t.expo_push_token,
    CASE 
        WHEN l.ctid IS NOT NULL THEN '✅ KEEP (Newest)'
        ELSE '❌ DELETE (Duplicate)'
    END as action
FROM app_push_tokens t
LEFT JOIN latest_tokens l ON t.ctid = l.ctid
ORDER BY t.user_id, t.created_at DESC;
