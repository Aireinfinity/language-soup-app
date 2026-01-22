-- 1. Identify where pg_net stores its data
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'net';

-- 2. Check for any failed requests to Expo in the last 10 minutes
-- (We'll try the most common table name 'http_request_queue' first if net.http_responses is missing)
SELECT 
    id, 
    status, 
    status_code, 
    error_msg, 
    response_body::jsonb, 
    created_at
FROM net.http_request_queue
WHERE url LIKE '%exp.host%'
AND created_at > NOW() - interval '10 minutes'
ORDER BY created_at DESC;
