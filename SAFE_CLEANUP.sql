-- SAFE CLEANUP 🛡️
-- Deletes ONLY "Test" and "Noah" messages.
-- SAVES the "Artist" challenge (and anything else).

WITH deleted_rows AS (
    DELETE FROM app_challenges
    WHERE created_at > NOW() - interval '2 hours'
    AND (
        prompt_text ILIKE '%noah%' 
        OR 
        prompt_text ILIKE '%test%'
        OR 
        prompt_text ILIKE '%force fire%'
    )
    RETURNING id, prompt_text
)
SELECT count(*) as "SPAM_MESSAGES_DELETED", array_agg(prompt_text) as "WHAT_WAS_REMOVED" FROM deleted_rows;
