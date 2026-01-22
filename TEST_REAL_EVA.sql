-- 🧪 TEST: Send notification to the REAL EVA (Eva Merrin :))
DO $$
DECLARE
    -- The correct ID for Eva Merrin :)
    target_user_id UUID := '00743f8e-b2a3-440b-b3ed-f222f81a8b86'; 
    user_token text;
BEGIN
    -- Get her token
    SELECT expo_push_token INTO user_token
    FROM app_push_tokens
    WHERE user_id = target_user_id
    AND expo_push_token LIKE 'ExponentPushToken%' 
    LIMIT 1;

    IF user_token IS NULL THEN
        RAISE NOTICE '❌ Eva Merrin :) has no valid push token!';
        RETURN;
    END IF;

    -- Send notification (PERFORM only, ignores return value)
    PERFORM net.http_post(
        url := 'https://exp.host/--/api/v2/push/send',
        headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb,
        body := jsonb_build_array(
            jsonb_build_object(
                'to', user_token,
                'title', 'hey Eva! 🍜',
                'body', 'did this one work?',
                'sound', 'default'
            )
        )
    );
    
    RAISE NOTICE '✅ Request SENT to Eva Merrin :) (Token: %)', user_token;
END $$;
