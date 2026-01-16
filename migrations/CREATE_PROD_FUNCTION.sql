-- 🚀 PRODUCTION VERSION - Auto-triggered by cron
-- Sends to ALL groups (except test groups) and notifies ALL users (deduplicated)

CREATE OR REPLACE FUNCTION process_scheduled_challenges_PROD()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    processed_ids UUID[];
    challenge_record RECORD;
    user_tokens jsonb;
    target_group_ids UUID[];
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

    -- 4. Send notifications to ALL users (FIXED FORMAT - individual objects)
    -- Get unique users from affected groups
    SELECT jsonb_agg(
        jsonb_build_object(
            'to', t.expo_push_token,
            'title', 'mmm goood soup!',
            'body', '🥳 new challenges just dropped!',
            'sound', 'default',
            'data', jsonb_build_object('type', 'challenge')
        )
    ) INTO user_tokens
    FROM (
        SELECT DISTINCT ON (t.user_id) t.expo_push_token
        FROM app_push_tokens t
        JOIN app_group_members gm ON gm.user_id = t.user_id
        WHERE gm.group_id = ANY(target_group_ids)
        AND t.expo_push_token LIKE 'ExponentPushToken%'
    ) t;

    -- Send to Expo
    IF user_tokens IS NOT NULL THEN
        PERFORM net.http_post(
            url := 'https://exp.host/--/api/v2/push/send',
            headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb,
            body := user_tokens
        );
    END IF;
END;
$$;
