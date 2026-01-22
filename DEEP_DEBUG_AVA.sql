-- 1. INSPECT TOKEN HISTORY FOR AVA
-- (If there are multiple, we might be sending to an old one)
SELECT 
    user_id, 
    expo_push_token, 
    updated_at,
    created_at
FROM app_push_tokens 
WHERE user_id = '26d90cc6-2d3e-43ca-bf71-60f51dbf3e44'
ORDER BY updated_at DESC;

-- 2. FORCE TEST SEND & CAPTURE ID
-- pg_net returns a 'request_id'. We need that to find the response.
DO $$
DECLARE
    req_id bigint;
BEGIN
    SELECT net.http_post(
        url := 'https://exp.host/--/api/v2/push/send',
        headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb,
        body := jsonb_build_array(
            jsonb_build_object(
                'to', 'ExponentPushToken[owdBpwGlyHJ7E4CiVWeXny]', -- Ava's specific token
                'title', 'Internal Debug 🧪',
                'body', 'Checking if Expo accepts this token right now...',
                'sound', 'default'
            )
        )
    ) INTO req_id;
    
    RAISE NOTICE 'Request ID: %. Wait 2 seconds then run the check query below.', req_id;
END $$;

-- 3. CHECK THE RESULT (Wait 2 seconds after running Step 2)
-- Note: Depending on your pg_net version, the table might be:
-- net.http_responses OR net._http_response OR check net.http_request_queue
SELECT 
    status_code, 
    content::text as response_body
FROM net.http_responses -- Try this first
ORDER BY id DESC LIMIT 1;
