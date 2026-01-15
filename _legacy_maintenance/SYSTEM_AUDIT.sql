-- SYSTEM AUDIT

-- 1. Check Triggers (Should be empty or unrelated)
SELECT tgname, tgenabled, tgrelid::regclass 
FROM pg_trigger 
WHERE tgname LIKE '%notify%';

-- 2. Check Push Tokens (Do we have any valid ones?)
SELECT count(*) as total_tokens, 
       count(*) filter (where expo_push_token like 'ExponentPushToken%') as valid_format_tokens
FROM app_push_tokens;

-- 3. Check Recent HTTP Failures (Why did the last one fail?)
SELECT id, state, http_status_code, error_msg, content::text
FROM net.http_request_queue
ORDER BY id DESC
LIMIT 3;

-- 4. Check Cron Jobs (What is running?)
SELECT jobid, jobname, active, command FROM cron.job;
