-- 🔍 TRY THIS: Use 'http_request_queue' (the standard table for pg_net 0.7+)
WITH request AS (
    SELECT net.http_post(
        url := 'https://exp.host/--/api/v2/push/send',
        headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb,
        body := jsonb_build_array(
            jsonb_build_object(
                'to', (SELECT expo_push_token FROM app_push_tokens WHERE user_id = '26d90cc6-2d3e-43ca-bf71-60f51dbf3e44'),
                'title', 'Internal Test 🧪',
                'body', 'Checking system connection...',
                'sound', 'default'
            )
        )
    ) as id
)
-- We'll try to find the response in 'http_request_queue' (common in newer pg_net)
-- or simply check the last 5 rows if the ID join fails
SELECT 
    id,
    status_code,
    response_body::jsonb
FROM net.http_request_queue
WHERE id = (SELECT id FROM request)
OR (created_at > NOW() - interval '1 minute')
ORDER BY created_at DESC
LIMIT 5;
