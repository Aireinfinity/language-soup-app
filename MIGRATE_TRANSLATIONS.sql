-- 1. Add translations column (stores the JSON map)
ALTER TABLE app_scheduled_challenges 
ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}'::jsonb;

-- 2. Update the "Simple" Cron Function with BETTER REGEX
CREATE OR REPLACE FUNCTION auto_send_approved_challenges()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    challenge_record RECORD;
    group_record RECORD;
    final_text TEXT;
    translation TEXT;
    clean_english TEXT;
BEGIN
    FOR challenge_record IN 
        SELECT * FROM app_scheduled_challenges 
        WHERE status = 'approved' AND scheduled_time <= NOW()
    LOOP
        FOR group_record IN SELECT * FROM app_groups LOOP
            -- 1. CLEAN THE ENGLISH (Remove both #challenge and whitespace)
            clean_english := TRIM(REGEXP_REPLACE(challenge_record.challenge_text, '^\s*#challenge\s*', '', 'ig'));
            final_text := clean_english;

            -- 2. TRY TO FIND TRANSLATION
            IF LOWER(group_record.language) NOT LIKE '%english%' THEN
                translation := challenge_record.translations->>group_record.language;
                IF translation IS NOT NULL AND translation <> '' THEN
                    final_text := final_text || E'\n' || translation;
                END IF;
            END IF;

            -- 3. ADD THE TAG BACK (Once)
            INSERT INTO app_challenges (group_id, prompt_text, created_by, created_at)
            VALUES (group_record.id, '#challenge' || E'\n' || final_text, COALESCE(challenge_record.created_by, '00000000-0000-0000-0000-000000000000'), NOW());
        END LOOP;

        UPDATE app_scheduled_challenges SET status = 'sent' WHERE id = challenge_record.id;
    END LOOP;
END;
$$;

-- 3. Ensure Job 1 is running and Job 6 is dead
SELECT cron.schedule('1', '*/1 * * * *', 'SELECT auto_send_approved_challenges()');
SELECT cron.unschedule(6);
