-- CHECK QUEUE STATUS (FIXED)
-- We use 'state' instead of 'status'
SELECT 
    id, 
    state,      -- Look for 'COMPLETED', 'ERROR', or 'PENDING'
    error_msg   -- If this has text, it failed internally
FROM net.http_request_queue 
ORDER BY id DESC 
LIMIT 1;
