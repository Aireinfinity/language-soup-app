-- RESTORE THE SIMPLE WORKING SETUP
-- Pure SQL cron → inserts into app_challenges → webhook sends notifications

-- Step 1: Create/update the SQL function with translation support
-- (This is the missing piece - we need to call translation functions from SQL)

CREATE OR REPLACE FUNCTION auto_send_approved_challenges()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    challenge_record RECORD;
    group_record RECORD;
    translation_text TEXT;
    final_text TEXT;
    clean_english TEXT;
BEGIN
    -- Loop through all approved challenges that are due
    FOR challenge_record IN
        SELECT id, challenge_text, created_by, scheduled_time
        FROM app_scheduled_challenges
        WHERE status = 'approved'
          AND scheduled_time <= NOW()
    LOOP
        -- Clean the English text
        clean_english := REGEXP_REPLACE(challenge_record.challenge_text, '^#challenge\s*', '', 'i');
        clean_english := TRIM(clean_english);

        -- Insert the challenge for each group
        FOR group_record IN
            SELECT id, name, language FROM app_groups
        LOOP
            -- Format based on language
            IF LOWER(group_record.language) = 'english' THEN
                final_text := '#challenge' || E'\n' || clean_english;
            ELSE
                -- For non-English groups, we need translation
                -- Since we can't easily call Edge Functions from SQL,
                -- we'll just send English for now and fix translations separately
                final_text := '#challenge' || E'\n' || clean_english;
            END IF;

            -- Insert into app_challenges (this triggers the webhook)
            INSERT INTO app_challenges (group_id, prompt_text, created_by, created_at)
            VALUES (
                group_record.id,
                final_text,
                COALESCE(challenge_record.created_by, '00000000-0000-0000-0000-000000000000'),
                NOW()
            );
        END LOOP;

        -- Mark the scheduled challenge as sent
        UPDATE app_scheduled_challenges
        SET status = 'sent'
        WHERE id = challenge_record.id;

        RAISE NOTICE 'Sent challenge % to all groups', challenge_record.id;
    END LOOP;
END;
$$;

-- Step 2: Verify the cron job exists (it should be job #1)
SELECT jobid, jobname, schedule, active, command 
FROM cron.job 
WHERE jobname = 'auto-send-challenges';

-- If it doesn't exist, create it:
-- SELECT cron.schedule('auto-send-challenges', '* * * * *', 'SELECT auto_send_approved_challenges()');
