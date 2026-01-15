-- CHECK THE QUEUE AGAIN
-- We need to know if it finished (COMPLETED) or failed (ERROR)
SELECT 
    id, 
    state,            -- PENDING, COMPLETED, ERROR
    http_status_code, -- 200 means success
    content::text,    -- What Expo replied
    error_msg         -- If PostgREST failed
FROM net.http_request_queue 
ORDER BY id DESC 
LIMIT 1;
