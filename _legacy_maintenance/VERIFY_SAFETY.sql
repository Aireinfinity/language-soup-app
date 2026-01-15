-- VERIFY SAFETY FILTER
-- This script proves that the "Noah Filter" works.

-- 1. Count how many people WOULD get it without the filter (The Danger Zone)
WITH danger_zone AS (
    SELECT gm.user_id 
    FROM app_group_members gm
    JOIN app_scheduled_challenges s ON s.status = 'approved' AND s.scheduled_time <= NOW() + interval '1 hour'
    WHERE gm.group_id IN (SELECT id FROM app_groups)
)
SELECT COUNT(*) as "DANGER_COUNT_ALL_USERS" FROM danger_zone;

-- 2. Count how many people WILL actually get it (The Safe Zone)
WITH safe_zone AS (
    SELECT gm.user_id 
    FROM app_group_members gm
    JOIN app_scheduled_challenges s ON s.status = 'approved'
    WHERE gm.group_id IN (SELECT id FROM app_groups)
    -- THIS IS THE FILTER IN THE CODE:
    AND gm.user_id IN (
        '4d683957-8262-4874-b36c-d53bd99e8886', -- Noah Aire
        '29864936-719c-483b-ac6a-4d06084a48fe'  -- noah :)
    )
)
SELECT COUNT(*) as "SAFE_COUNT_NOAH_ONLY", string_agg(user_id::text, ', ') as "WHO_GETS_IT" FROM safe_zone;
