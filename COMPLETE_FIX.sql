-- COMPLETE FIX: Restore original setup and remove duplicate
-- Run this in Supabase SQL Editor

-- Step 1: Create the missing function (restores Job #1)
CREATE OR REPLACE FUNCTION auto_send_approved_challenges()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Insert due challenges into app_challenges (triggers webhook → notifications)
    INSERT INTO app_challenges (group_id, prompt_text, created_by, created_at)
    SELECT 
        g.id as group_id,
        sc.challenge_text,
        COALESCE(sc.created_by, '00000000-0000-0000-0000-000000000000'),
        NOW()
    FROM app_scheduled_challenges sc
    CROSS JOIN app_groups g
    WHERE sc.status = 'pending'
      AND sc.scheduled_time <= NOW();

    -- Mark them as sent
    UPDATE app_scheduled_challenges
    SET status = 'sent'
    WHERE status = 'pending' 
      AND scheduled_time <= NOW();
END;
$$;

-- Step 2: Remove the duplicate cron job (Job #2)
SELECT cron.unschedule(3); -- Removes 'send-scheduled-challenges'

-- Step 3: Verify only one job remains
SELECT jobid, jobname, schedule, active 
FROM cron.job 
WHERE jobname LIKE '%challenge%';

-- Expected: Only 'auto-send-challenges' (jobid 1) should remain
-- Your challenge will send within 1 minute! ✅
