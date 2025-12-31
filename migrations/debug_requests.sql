-- Check counts by status
SELECT status, COUNT(*) 
FROM app_language_requests 
GROUP BY status;

-- Show first 10 rows to check language and message values
SELECT id, language, message, status, user_id 
FROM app_language_requests 
LIMIT 10;
