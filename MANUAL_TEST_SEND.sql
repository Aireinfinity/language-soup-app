-- 🔍 TROUBLESHOOTING TOOL
-- 1. Run this to find your user and their token status
SELECT 
    u.id as user_id,
    u.display_name,
    u.email,
    CASE WHEN t.expo_push_token IS NOT NULL THEN '✅ Has Token' ELSE '❌ No Token' END as token_status,
    t.expo_push_token,
    t.updated_at as last_token_update
FROM users u
LEFT JOIN app_push_tokens t ON u.id = t.user_id
ORDER BY t.updated_at DESC NULLS LAST
LIMIT 50;

-- 📧 SEND TEST NOTIFICATION TO SPECIFIC USER
-- Replace 'TARGET_USER_UUID' with the ID you found above
/*
DO $$
DECLARE
    target_user_id UUID := 'TARGET_USER_UUID'; -- PUT UUID HERE
    user_token text;
    response_status int;
    response_body text;
BEGIN
    -- Get token
    SELECT expo_push_token INTO user_token
    FROM app_push_tokens
    WHERE user_id = target_user_id
    LIMIT 1;

    IF user_token IS NULL THEN
        RAISE NOTICE 'User has no push token!';
        RETURN;
    END IF;

    -- Send notification (Individual object format)
    SELECT 
        status, 
        content::text 
    INTO 
        response_status, 
        response_body
    FROM net.http_post(
        url := 'https://exp.host/--/api/v2/push/send',
        headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb,
        body := jsonb_build_array(
            jsonb_build_object(
                'to', user_token,
                'title', 'Test Notification 🧪',
                'body', 'This is a test notification just for you!',
                'sound', 'default',
                'data', jsonb_build_object('type', 'test')
            )
        )
    );
    
    RAISE NOTICE 'Sent! Status: %, Body: %', response_status, response_body;
END $$;
*/
