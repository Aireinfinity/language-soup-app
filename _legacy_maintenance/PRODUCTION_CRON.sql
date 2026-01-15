-- PRODUCTION_CRON.sql 🚀
-- This is the REAL DEAL.
-- 1. No more "Noah Only" Safety Filters.
-- 2. No more "Solo Group" Isolation.
-- 3. Notifies EVERYONE in the affected groups.

CREATE OR REPLACE FUNCTION process_scheduled_challenges_safe()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
    processed_ids UUID[];
    target_group_ids UUID[];
BEGIN
    -- 1. Identify valid challenges to process (Capture IDs first)
    SELECT array_agg(id) INTO processed_ids
    FROM app_scheduled_challenges
    WHERE status = 'approved'
    AND scheduled_time <= (NOW() + interval '2 hours'); -- 2-Hour Tolerance

    -- If nothing to do, exit
    IF processed_ids IS NULL THEN
        RETURN;
    END IF;

    -- 2. Insert messages (Fan out to ALL Groups)
    -- We perform the insert and Capture the Group IDs for notifications
    WITH inserted_rows AS (
        INSERT INTO app_challenges (group_id, prompt_text, created_by, created_at)
        SELECT 
            g.id,
            -- DUMB LOOKUP LOGIC:
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
        CROSS JOIN app_groups g -- This sends to EVERY GROUP...
        WHERE s.id = ANY(processed_ids)
        -- EXCLUSIONS: Do NOT send to these test groups
        AND g.id NOT IN (
            '439ffe03-96fa-41d3-96f1-c0a8a779ce9d', -- noah's test group solo
            'a34c1008-72ea-4dbb-a605-6673f6c5f6b3'  -- app testers :) (click here!)
        )
        RETURNING group_id
    )
    SELECT array_agg(DISTINCT group_id) INTO target_group_ids FROM inserted_rows;

    -- 3. Mark the scheduled items as 'sent'
    UPDATE app_scheduled_challenges
    SET status = 'sent'
    WHERE id = ANY(processed_ids);

    -- 4. BROADCAST NOTIFICATIONS (To Everyone in those groups)
    PERFORM net.http_post(
        url := 'https://exp.host/--/api/v2/push/send',
        headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb,
        body := jsonb_build_array(
            jsonb_build_object(
                'to', (
                    -- Find ALL tokens for valid members of the affected groups
                    SELECT jsonb_agg(DISTINCT t.expo_push_token)
                    FROM app_push_tokens t
                    JOIN app_group_members gm ON gm.user_id = t.user_id
                    WHERE gm.group_id = ANY(target_group_ids)
                    AND t.expo_push_token LIKE 'ExponentPushToken%'
                ),
                'title', '🥳 new challenges just dropped!',
                'body', 'tap to see what it is!',
                'sound', 'default'
            )
        )
    );
END;
$func$;
