-- DIAGNOSE FAILURE
-- Check if the challenge was marked 'sent' and if messages were actually created.

-- 1. Check the Scheduled Challenge Status
SELECT id, challenge_text, status, scheduled_time 
FROM app_scheduled_challenges 
ORDER BY scheduled_time DESC LIMIT 1;

-- 2. Check if any messages were created in the last 10 minutes
SELECT count(*) as "MESSAGES_CREATED_LAST_10_MIN"
FROM app_challenges
WHERE created_at > NOW() - interval '10 minutes';

-- 3. Verify user group membership for the hardcoded IDs
SELECT count(*) as "GROUPS_NOAH_IS_IN"
FROM app_group_members
WHERE user_id IN (
    '4d683957-8262-4874-b36c-d53bd99e8886', 
    '29864936-719c-483b-ac6a-4d06084a48fe'
);
