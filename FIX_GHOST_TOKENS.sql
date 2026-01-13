-- FIX GHOST TOKENS 👻
-- You have 33 tokens. We need to keep only the NEWEST one.

WITH kept_tokens AS (
    SELECT user_id, max(created_at) as newest_token_date
    FROM app_push_tokens
    WHERE user_id IN ('4d683957-8262-4874-b36c-d53bd99e8886', '29864936-719c-483b-ac6a-4d06084a48fe')
    GROUP BY user_id
)
DELETE FROM app_push_tokens pt
USING kept_tokens kt
WHERE pt.user_id = kt.user_id
AND pt.created_at < kt.newest_token_date; -- Delete everything older than the newest key

-- Verify count is now 1
SELECT user_id, count(*) as "CLEAN_TOKEN_COUNT" 
FROM app_push_tokens 
WHERE user_id IN ('4d683957-8262-4874-b36c-d53bd99e8886', '29864936-719c-483b-ac6a-4d06084a48fe')
GROUP BY user_id;
