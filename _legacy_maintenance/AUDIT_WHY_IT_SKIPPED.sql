-- AUDIT: WHY IT SKIPPED
-- This mimics the Cron Job logic exactly and reports WHY it ignored your challenge.

SELECT 
    id,
    challenge_text,
    scheduled_time as "DB_Stored_Time_UTC",
    NOW() as "Server_Current_Time_UTC",
    
    -- CHECK 1: TIME
    (scheduled_time <= NOW()) as "IS_TIME_READY?",
    
    -- CHECK 2: SAFETY FILTER
    EXISTS (
        SELECT 1 FROM app_groups g
        JOIN app_group_members gm ON gm.group_id = g.id
        WHERE gm.user_id IN ('4d683957-8262-4874-b36c-d53bd99e8886', '29864936-719c-483b-ac6a-4d06084a48fe')
    ) as "IS_SAFETY_FILTER_PASSED?"

FROM app_scheduled_challenges
WHERE status = 'approved'
ORDER BY created_at DESC
LIMIT 1;
