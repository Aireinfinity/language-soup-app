-- FIND SPAM VICTIMS 🚨
-- Who has the most "Ghost Tokens"?
-- If Nandi got 20 notifications, she should be at the top of this list.

SELECT 
    user_id, 
    count(*) as token_count,
    max(created_at) as last_seen
FROM app_push_tokens 
GROUP BY user_id
HAVING count(*) > 1
ORDER BY token_count DESC;
