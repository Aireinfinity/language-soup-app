-- 🚀 ROBUST PRODUCTION VERSION
-- Fixes:
-- 1. Picks the NEWEST token for every user (crucial for old accounts)
-- 2. Batches sends in groups of 100 (Expo limit)

CREATE OR REPLACE FUNCTION process_scheduled_challenges_PROD()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    processed_ids UUID[];
    target_group_ids UUID[];
    user_token_record RECORD;
    token_batch jsonb[] := '{}';
    batch_count int := 0;
BEGIN
    -- 1. Find approved challenges
    SELECT array_agg(id) INTO processed_ids
    FROM app_scheduled_challenges
    WHERE status = 'approved'
    AND scheduled_time <= NOW();

    IF processed_ids IS NULL THEN
        RETURN;
    END IF;

    -- 2. Insert into ALL groups (except test groups)
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
        WHERE s.id = ANY(processed_ids)
        -- EXCLUDE test groups
        AND g.id NOT IN (
            '439ffe03-96fa-41d3-96f1-c0a8a779ce9d',  -- noah's test group solo
            'a34c1008-72ea-4dbb-a605-6673f6c5f6b3'   -- app testers :)
        )
        RETURNING group_id
    )
    SELECT array_agg(DISTINCT group_id) INTO target_group_ids FROM inserted_rows;

    -- 3. Mark as sent
    UPDATE app_scheduled_challenges
    SET status = 'sent'
    WHERE id = ANY(processed_ids);

    -- 4. Gather latest tokens and SEND IN BATCHES OF 100
    FOR user_token_record IN 
        SELECT DISTINCT ON (t.user_id) t.expo_push_token
        FROM app_push_tokens t
        JOIN app_group_members gm ON gm.user_id = t.user_id
        WHERE gm.group_id = ANY(target_group_ids)
        AND t.expo_push_token LIKE 'ExponentPushToken%'
        ORDER BY t.user_id, t.updated_at DESC -- ALWAYS PICK NEWEST
    LOOP
        token_batch := array_append(token_batch, jsonb_build_object(
            'to', user_token_record.expo_push_token,
            'title', 'mmm goood soup!',
            'body', '🥳 new challenges just dropped!',
            'sound', 'default',
            'data', jsonb_build_object('type', 'challenge')
        ));
        batch_count := batch_count + 1;

        -- Every 100 tokens, send the batch
        IF batch_count = 100 THEN
            PERFORM net.http_post(
                url := 'https://exp.host/--/api/v2/push/send',
                headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb,
                body := to_jsonb(token_batch)
            );
            token_batch := '{}';
            batch_count := 0;
        END IF;
    END LOOP;

    -- Send final remaining batch
    IF batch_count > 0 THEN
        PERFORM net.http_post(
            url := 'https://exp.host/--/api/v2/push/send',
            headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb,
            body := to_jsonb(token_batch)
        );
    END IF;
END;
$$;
