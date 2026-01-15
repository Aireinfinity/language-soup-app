-- DIRECT EXPO SEND (Bypass Edge Function Auth)
-- Sends directly to Expo Push API from Postgres

DO $$
DECLARE
    push_tokens TEXT[];
    token_record RECORD;
    message_batch JSONB := '[]'::JSONB;
    message_item JSONB;
    batch_size INT := 0;
    response_status INT;
    response_body TEXT;
BEGIN
    -- 1. Gather all unique valid ExponentPushTokens
    -- (We distinct by user_id inside the app_push_tokens query implicitly if needed, 
    -- but here we just grab all tokens to be safe, or distinct on token string)
    FOR token_record IN 
        SELECT DISTINCT expo_push_token 
        FROM app_push_tokens 
        WHERE user_id = '38e800d6-1295-4e7c-a010-00f78e6b0d1d'::UUID -- YOUR ID
          AND expo_push_token LIKE 'ExponentPushToken%'
    LOOP
        -- Construct message for this token
        message_item := jsonb_build_object(
            'to', token_record.expo_push_token,
            'title', 'Update 🥣',
            'body', 'sorry fixing notification spam 👨‍💻 one ping only now!',
            'sound', 'default'
        );

        -- Add to batch
        message_batch := message_batch || message_item;
        batch_size := batch_size + 1;

        -- Expo limits: 100 per batch. If we hit 100, send and clear.
        IF batch_size >= 100 THEN
            PERFORM net.http_post(
                url := 'https://exp.host/--/api/v2/push/send',
                headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb,
                body := message_batch
            );
            RAISE NOTICE 'Sent batch of 100...';
            message_batch := '[]'::JSONB;
            batch_size := 0;
        END IF;
    END LOOP;

    -- Send remaining
    IF batch_size > 0 THEN
        PERFORM net.http_post(
            url := 'https://exp.host/--/api/v2/push/send',
            headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb,
            body := message_batch
        );
        RAISE NOTICE 'Sent final batch of %...', batch_size;
    END IF;

    RAISE NOTICE '✅ Done. Direct request sent to Expo.';
END;
$$;
