-- 🔍 DEBUG AVA'S NOTIFICATION
-- 1. Check token details
SELECT 
    user_id,
    expo_push_token,
    platform,
    updated_at,
    created_at,
    NOW() - updated_at as time_since_update
FROM app_push_tokens
WHERE user_id = '26d90cc6-2d3e-43ca-bf71-60f51dbf3e44';

-- 2. Send and CAPTURE response from Expo
-- We need to see the JSON response to know IF Expo accepted it.
    -- Send and CAPTURE response
    SELECT 
        status_code,
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
                'title', 'Debug Test',
                'body', 'Checking response...',
                'sound', 'default'
            )
        )
    );

    -- 3. Return the results
    -- We use a temp table or just a final select to show data
    -- But since this is a DO block, we can't easily return a table to the UI.
    -- Let's just raise notice, BUT also try to insert into a log table if you have one? 
    -- Or better, let's just use RAISE EXCEPTION to force the output to show if they miss the notice? 
    -- Actually, let's just make it a standard SELECT query instead of a DO block if possible?
    -- net.http_post can be called in a SELECT.
    
    RAISE NOTICE 'Response Code: %, Body: %', response_status, response_body;
END $$;

-- ALTERNATIVE: Run this simple query to see the result directly in the table output
SELECT 
    'Expo Response' as operation,
    status_code,
    content::jsonb as response_data
FROM net.http_post(
    url := 'https://exp.host/--/api/v2/push/send',
    headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb,
    body := jsonb_build_array(
        jsonb_build_object(
            'to', (SELECT expo_push_token FROM app_push_tokens WHERE user_id = '26d90cc6-2d3e-43ca-bf71-60f51dbf3e44'),
            'title', 'Debug Test',
            'body', 'Checking response...',
            'sound', 'default'
        )
    )
);
