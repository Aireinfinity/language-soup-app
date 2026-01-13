-- FIX GLOBAL GHOST TOKENS 🌍
-- Safety Script: Ensures EVERY user has only 1 push token (The most recent one).
-- Uses 'ctid' because there is no primary key 'id' column.

DELETE FROM app_push_tokens
WHERE ctid NOT IN (
    SELECT ctid
    FROM (
        SELECT ctid,
               ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
        FROM app_push_tokens
    ) t
    WHERE rn = 1
);

-- Verify after running
SELECT count(*) as "Remaining_Tokens" FROM app_push_tokens;
