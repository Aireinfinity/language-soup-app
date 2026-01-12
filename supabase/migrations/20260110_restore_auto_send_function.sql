-- Recreate the missing auto_send_approved_challenges() function
-- This is the "simple logic" that was working before

CREATE OR REPLACE FUNCTION auto_send_approved_challenges()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    challenge_record RECORD;
    group_record RECORD;
BEGIN
    -- Loop through all pending challenges that are due
    FOR challenge_record IN
        SELECT id, challenge_text, created_by, scheduled_time
        FROM app_scheduled_challenges
        WHERE status = 'pending'
          AND scheduled_time <= NOW()
    LOOP
        -- Insert the challenge into app_challenges for each group
        FOR group_record IN
            SELECT id FROM app_groups
        LOOP
            INSERT INTO app_challenges (group_id, prompt_text, created_by, created_at)
            VALUES (
                group_record.id,
                challenge_record.challenge_text,
                COALESCE(challenge_record.created_by, '00000000-0000-0000-0000-000000000000'),
                NOW()
            );
        END LOOP;

        -- Mark the scheduled challenge as sent
        UPDATE app_scheduled_challenges
        SET status = 'sent'
        WHERE id = challenge_record.id;

        -- Log success
        RAISE NOTICE 'Sent challenge % to all groups', challenge_record.id;
    END LOOP;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION auto_send_approved_challenges() TO authenticated;
GRANT EXECUTE ON FUNCTION auto_send_approved_challenges() TO service_role;

-- Test the function (optional - comment out if you don't want to test immediately)
-- SELECT auto_send_approved_challenges();
