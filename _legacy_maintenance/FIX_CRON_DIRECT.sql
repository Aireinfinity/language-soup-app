-- ALTERNATIVE: Create a SQL function that sends challenges directly
-- This bypasses the edge function and pg_net issues

CREATE OR REPLACE FUNCTION send_due_challenges()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    challenge_record RECORD;
    group_record RECORD;
    challenge_id UUID;
    clean_text TEXT;
BEGIN
    -- Get all approved challenges that are due
    FOR challenge_record IN 
        SELECT * FROM app_scheduled_challenges
        WHERE status = 'approved' 
        AND scheduled_time <= NOW()
    LOOP
        -- Clean the challenge text
        clean_text := REGEXP_REPLACE(challenge_record.challenge_text, '^#challenge\s*', '', 'i');
        
        -- Insert challenge into each group
        FOR group_record IN SELECT id, language FROM app_groups LOOP
            -- For English groups: just #challenge + text
            -- For other groups: #challenge + English + translation (we'll skip translation for now)
            INSERT INTO app_challenges (group_id, prompt_text, created_by)
            VALUES (
                group_record.id,
                '#challenge' || E'\n' || clean_text,
                '00000000-0000-0000-0000-000000000000'::UUID
            );
        END LOOP;
        
        -- Mark as sent
        UPDATE app_scheduled_challenges
        SET status = 'sent'
        WHERE id = challenge_record.id;
        
        RAISE NOTICE 'Sent challenge: %', challenge_record.id;
    END LOOP;
END;
$$;

-- Test it immediately
SELECT send_due_challenges();

-- Check if it worked
SELECT status FROM app_scheduled_challenges WHERE challenge_text LIKE '%night owl%';
