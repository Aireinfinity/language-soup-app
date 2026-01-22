-- 1. Check if Ava's UUID exists in app_users
SELECT id, email, created_at 
FROM app_users 
WHERE id = '26d90cc6-2d3e-43ca-bf71-60f51dbf3e44';

-- 2. Check if her TOKEN is shared with any other user_id
SELECT user_id, expo_push_token, updated_at
FROM app_push_tokens
WHERE expo_push_token = (
    SELECT expo_push_token 
    FROM app_push_tokens 
    WHERE user_id = '26d90cc6-2d3e-43ca-bf71-60f51dbf3e44'
    LIMIT 1
);

-- 3. Check if she is an "Admin" or has some flag that might exclude her
SELECT * FROM app_users WHERE id = '26d90cc6-2d3e-43ca-bf71-60f51dbf3e44';
