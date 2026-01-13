-- FIND NOAH
SELECT id, email, raw_user_meta_data 
FROM auth.users 
WHERE email ILIKE '%noah%' 
   OR raw_user_meta_data->>'full_name' ILIKE '%noah%'
LIMIT 5;
