-- SAFE AUTO-SENDER v3 (Function Based)
-- This avoids the "unterminated dollar string" error by moving logic into a function.

-- 1. Create the function first
CREATE OR REPLACE FUNCTION process_scheduled_challenges_safe()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
    sent_count INT;
BEGIN
    -- A. Insert challenges (fan out to groups)
    -- BUT ONLY FOR GROUPS NOAH IS IN (Safety Filter)
    WITH inserted_rows AS (
        INSERT INTO app_challenges (group_id, prompt_text, created_by, created_at)
        SELECT 
            g.id,
            -- SMART TRANSLATION LOGIC:
            CASE 
                -- 1. If we have a translation and it's not empty...
                WHEN s.translations ->> g.language IS NOT NULL 
                        AND length(s.translations ->> g.language) > 0 
                THEN 
                    -- Format: #challenge + English + Translation
                    '#challenge' || E'\n' || 
                    -- Remove #challenge from English if user typed it, to avoid double header
                    TRIM(LEADING '#challenge' FROM s.challenge_text) || E'\n' || 
                    (s.translations ->> g.language)

                ELSE 
                    -- 2. Fallback to original English only
                    CASE 
                        WHEN s.challenge_text ILIKE '#challenge%' THEN s.challenge_text
                        ELSE '#challenge' || E'\n' || s.challenge_text
                    END
            END,
            s.created_by,
            NOW()
        FROM app_scheduled_challenges s
        CROSS JOIN app_groups g
        WHERE s.status = 'approved' 
            AND s.scheduled_time <= NOW()
            -- SAFETY FILTER: Only groups where Noah is a member
            AND EXISTS (
                SELECT 1 FROM app_group_members gm 
                WHERE gm.group_id = g.id 
                AND gm.user_id IN (
                    '4d683957-8262-4874-b36c-d53bd99e8886', -- Noah Aire
                    '29864936-719c-483b-ac6a-4d06084a48fe'  -- noah :)
                )
            )
        RETURNING 1
    )
    SELECT count(*) INTO sent_count FROM inserted_rows;

    -- B. Mark processed challenges as 'sent'
    UPDATE app_scheduled_challenges
    SET status = 'sent'
    WHERE status = 'approved' 
        AND scheduled_time <= NOW();

    -- C. Send ONE Notification to Noah (If anything was sent)
    IF sent_count > 0 THEN
            PERFORM net.http_post(
            url := 'https://exp.host/--/api/v2/push/send',
            headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb,
            body := jsonb_build_array(
                jsonb_build_object(
                    'to', (
                        SELECT jsonb_agg(expo_push_token) 
                        FROM app_push_tokens 
                        WHERE expo_push_token LIKE 'ExponentPushToken%'
                        AND user_id IN (
                            '4d683957-8262-4874-b36c-d53bd99e8886', 
                            '29864936-719c-483b-ac6a-4d06084a48fe'
                        )
                    ),
                    'title', 'New Challenge! 🥣',
                    'body', 'Test challenge sent successfully!',
                    'sound', 'default'
                )
            )
        );
    END IF;
END;
$func$;

-- 2. Schedule the function
SELECT cron.schedule(
    'process-scheduled-challenges-v2', -- Job Name
    '* * * * *',                       -- Every Minute
    'SELECT process_scheduled_challenges_safe()'
);
