-- CHECK GLOBAL DUPLICATES 🌍
-- Do other users have "Ghost Tokens" too?

SELECT user_id, count(*) as token_count 
FROM app_push_tokens 
GROUP BY user_id
HAVING count(*) > 1
ORDER BY token_count DESC;
