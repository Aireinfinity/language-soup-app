-- EMERGENCY CLEANUP 🧹
-- Deleting the unintended messages from the chat history.

WITH deleted_rows AS (
    DELETE FROM app_challenges
    WHERE created_at > NOW() - interval '20 minutes'
    AND (
        prompt_text ILIKE '%noah%' 
        OR 
        prompt_text ILIKE '%test%'
        OR 
        prompt_text ILIKE '%challenge%' -- Including this just in case
    )
    RETURNING id, prompt_text
)
SELECT count(*) as "DELETED_MESSAGES", array_agg(prompt_text) as "TEXTS_REMOVED" FROM deleted_rows;
