-- Check support messages that might be feature requests
SELECT id, category, message, user_id, created_at 
FROM app_support_messages 
WHERE category = 'feature_request' 
ORDER BY created_at DESC 
LIMIT 10;
