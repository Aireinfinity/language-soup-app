-- 🧪 TEST: Send notification to NOAH only (PERFORM method)
DO $$
DECLARE
    target_user_id UUID := '29864936-719c-483b-ac6a-4d06084a48fe'; 
    user_token text;
BEGIN
    -- Get token
    SELECT expo_push_token INTO user_token
    FROM app_push_tokens
    WHERE user_id = target_user_id
    AND expo_push_token LIKE 'ExponentPushToken%' 
    LIMIT 1;

    IF user_token IS NULL THEN
        RAISE NOTICE '❌ Noah has no valid push token!';
        RETURN;
    END IF;

    -- Send notification (PERFORM only, ignores return value)
    PERFORM net.http_post(
        url := 'https://exp.host/--/api/v2/push/send',
        headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb,
        body := jsonb_build_array(
            jsonb_build_object(
                'to', user_token,
                'title', 'Test Notification 🧪',
                'body', 'If you see this, notifications are WORKING on iOS! 📱',
                'sound', 'default'
            )
        )
    );
    
    RAISE NOTICE '✅ Request SENT to Expo (Check device now!)';
END $$;
