-- SIMPLEST FIX: Restore the missing function
-- Your cron job is already running, it just needs this function to exist

CREATE OR REPLACE FUNCTION auto_send_approved_challenges()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Insert due challenges into app_challenges (this triggers the webhook → sends notifications)
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

-- That's it! Run this and your challenge will send within 1 minute.
