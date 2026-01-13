-- FINAL SIMPLIFIED AUTO-SENDER
-- Logic: The dashboard saves the EXACT text to send for each language.
-- We just look it up. No formatting logic here.

-- 1. Create the simplified function
CREATE OR REPLACE FUNCTION process_scheduled_challenges_safe()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
    processed_ids UUID[];
BEGIN
    -- 1. Identify valid challenges to process (Capture IDs first)
    SELECT array_agg(id) INTO processed_ids
    FROM app_scheduled_challenges
    WHERE status = 'approved'
    AND scheduled_time <= (NOW() + interval '2 hours');

    -- If nothing to do, exit
    IF processed_ids IS NULL THEN
        RETURN;
    END IF;

    -- 2. Insert messages (Targeting Solo Group ONLY)
    INSERT INTO app_challenges (group_id, prompt_text, created_by, created_at)
    SELECT 
        '439ffe03-96fa-41d3-96f1-c0a8a779ce9d'::uuid, -- TARGET: Noah's Solo Group
        -- Use the formatted text directly
        CASE 
            WHEN challenge_text ILIKE '#challenge%' THEN challenge_text 
            ELSE '#challenge' || E'\n' || challenge_text 
        END,
        created_by,
        NOW()
    FROM app_scheduled_challenges
    WHERE id = ANY(processed_ids);

    -- 3. CRITICAL: Mark THESE IDs as 'sent' immediately
    UPDATE app_scheduled_challenges
    SET status = 'sent'
    WHERE id = ANY(processed_ids);

    -- 4. Send Notification (Once)
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
                'title', '🥳 new challenges just dropped!',
                'body', 'tap to see what it is!',
                'sound', 'default'
            )
        )
    );
END;
$func$;

-- 2. Schedule it (same as before)
SELECT cron.schedule(
    'process-scheduled-challenges-v2', -- Job Name
    '* * * * *',                       -- Every Minute
    'SELECT process_scheduled_challenges_safe()'
);
