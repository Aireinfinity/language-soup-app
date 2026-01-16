-- 🧪 TEST VERSION - Manual trigger for safe testing
-- Only sends to noah's test group solo and only notifies noah :)

CREATE OR REPLACE FUNCTION process_scheduled_challenges_TEST()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    processed_ids UUID[];
    challenge_record RECORD;
    notification_payload jsonb;
    user_tokens jsonb;
BEGIN
    -- 1. Find approved challenges
    SELECT array_agg(id) INTO processed_ids
    FROM app_scheduled_challenges
    WHERE status = 'approved'
    AND scheduled_time <= NOW();

    IF processed_ids IS NULL THEN
        RAISE NOTICE 'No challenges to process';
        RETURN;
    END IF;

    -- 2. Insert into ONLY noah's test group solo
    FOR challenge_record IN 
        SELECT 
            s.id,
            s.challenge_text,
            s.translations,
            s.created_by,
            g.id as group_id,
            g.language
        FROM app_scheduled_challenges s
        CROSS JOIN app_groups g
        WHERE s.id = ANY(processed_ids)
        AND g.id = '439ffe03-96fa-41d3-96f1-c0a8a779ce9d'  -- noah's test group solo
    LOOP
        -- Insert challenge
        INSERT INTO app_challenges (group_id, prompt_text, created_by, created_at)
        VALUES (
            challenge_record.group_id,
            COALESCE(
                challenge_record.translations ->> challenge_record.language,
                CASE 
                    WHEN challenge_record.challenge_text ILIKE '#challenge%' THEN challenge_record.challenge_text
                    ELSE '#challenge' || E'\n' || challenge_record.challenge_text
                END
            ),
            challenge_record.created_by,
            NOW()
        );
    END LOOP;

    -- 3. Mark as sent
    UPDATE app_scheduled_challenges
    SET status = 'sent'
    WHERE id = ANY(processed_ids);

    -- 4. Send notification to ONLY noah :)
    -- Build individual notification objects (FIXED FORMAT)
    SELECT jsonb_agg(
        jsonb_build_object(
            'to', expo_push_token,
            'title', 'mmm goood soup!',
            'body', '🥳 new challenges just dropped!',
            'sound', 'default',
            'data', jsonb_build_object('type', 'challenge')
        )
    ) INTO user_tokens
    FROM app_push_tokens
    WHERE user_id = '29864936-719c-483b-ac6a-4d06084a48fe'  -- noah :)
    AND expo_push_token LIKE 'ExponentPushToken%';

    -- Send to Expo
    IF user_tokens IS NOT NULL THEN
        PERFORM net.http_post(
            url := 'https://exp.host/--/api/v2/push/send',
            headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb,
            body := user_tokens
        );
        RAISE NOTICE 'Sent % notification(s) to noah', jsonb_array_length(user_tokens);
    END IF;

    RAISE NOTICE 'TEST: Processed % challenge(s)', array_length(processed_ids, 1);
END;
$$;
