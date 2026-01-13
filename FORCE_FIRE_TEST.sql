-- FORCE FIRE TEST 🔫
-- Bypasses the time check and sends the specific challenge NOW.
-- Only for the specific ID found in your logs.

DO $$
DECLARE
    target_challenge_id UUID;
    sent_count INT;
BEGIN
    -- 1. Find the pending challenge (ignoring time)
    SELECT id INTO target_challenge_id 
    FROM app_scheduled_challenges 
    WHERE challenge_text ILIKE '%NOAH TRANSLATE%' 
    AND status = 'approved'
    LIMIT 1;

    IF target_challenge_id IS NULL THEN
        RAISE NOTICE '❌ Could not find an approved NOAH TRANSLATE challenge.';
        RETURN;
    END IF;

    -- 2. Insert into app_challenges (Fan out)
    WITH inserted_rows AS (
        INSERT INTO app_challenges (group_id, prompt_text, created_by, created_at)
        SELECT 
            g.id,
            COALESCE(
                s.translations ->> g.language, 
                CASE 
                    WHEN s.challenge_text ILIKE '#challenge%' THEN s.challenge_text 
                    ELSE '#challenge' || E'\n' || s.challenge_text 
                END
            ),
            s.created_by,
            NOW()
        FROM app_scheduled_challenges s
        CROSS JOIN app_groups g
        WHERE s.id = target_challenge_id
            -- STAY SAFE: NOAH FILTER
            AND EXISTS (
                SELECT 1 FROM app_group_members gm 
                WHERE gm.group_id = g.id 
                AND gm.user_id IN (
                    '4d683957-8262-4874-b36c-d53bd99e8886', 
                    '29864936-719c-483b-ac6a-4d06084a48fe'
                )
            )
        RETURNING 1
    )
    SELECT count(*) INTO sent_count FROM inserted_rows;

    -- 3. Notification
    IF sent_count > 0 THEN
        PERFORM net.http_post(
            url := 'https://exp.host/--/api/v2/push/send',
            headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb,
            body := jsonb_build_array(
                jsonb_build_object(
                    'to', (SELECT jsonb_agg(expo_push_token) FROM app_push_tokens WHERE expo_push_token LIKE 'ExponentPushToken%' AND user_id IN ('4d683957-8262-4874-b36c-d53bd99e8886', '29864936-719c-483b-ac6a-4d06084a48fe')),
                    'title', '🥳 new challenges just dropped!',
                    'body', 'Force fired! Tap to view.',
                    'sound', 'default'
                )
            )
        );
        
        -- 4. Mark as sent
        UPDATE app_scheduled_challenges 
        SET status = 'sent' 
        WHERE id = target_challenge_id;
        
        RAISE NOTICE '✅ FORCE FIRE SUCCESS! Sent % messages.', sent_count;
    ELSE
        RAISE NOTICE '⚠️ Found challenge but matched 0 groups (Safety Filter?).';
    END IF;
END $$;
