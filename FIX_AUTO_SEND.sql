-- Fix the auto_send_approved_challenges() function
-- The issue: it's checking for status = 'pending' but your challenges are 'approved'!

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
    WHERE sc.status = 'approved'  -- Changed from 'pending' to 'approved'!
      AND sc.scheduled_time <= NOW();

    -- Mark them as sent
    UPDATE app_scheduled_challenges
    SET status = 'sent'
    WHERE status = 'approved'  -- Changed from 'pending' to 'approved'!
      AND scheduled_time <= NOW();
END;
$$;

-- Test it now
SELECT auto_send_approved_challenges();

-- Check if it worked
SELECT status FROM app_scheduled_challenges WHERE challenge_text LIKE '%animal%';
