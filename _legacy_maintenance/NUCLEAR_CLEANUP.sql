-- NUCLEAR CLEANUP ☢️
-- Deletes ALL challenges sent in the last hour.
-- No text filters. Just kills everything new.

WITH deleted_rows AS (
    DELETE FROM app_challenges
    WHERE created_at > NOW() - interval '60 minutes'
    RETURNING id, prompt_text, created_at
)
SELECT 
    count(*) as "TOTAL_DELETED", 
    min(created_at) as "OLDEST_DELETED",
    max(created_at) as "NEWEST_DELETED"
FROM deleted_rows;

-- After running this, close and reopen your app to clear the cache.
