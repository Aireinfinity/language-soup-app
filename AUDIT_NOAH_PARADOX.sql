-- 🔎 THE NOAH PARADOX AUDIT
-- How can one UUID have 5 rows if it is the Primary Key?

-- 1. Check your UUID specifically
SELECT 
    user_id, 
    COUNT(*) as row_count,
    string_agg(expo_push_token, ' | ') as all_tokens
FROM app_push_tokens
WHERE user_id = '29864936-719c-483b-ac6a-4d06084a48fe'
GROUP BY user_id;

-- 2. Check if there are TWO tables with similar names
-- (Sometimes cases like 'App_Push_Tokens' vs 'app_push_tokens' cause chaos)
SELECT schemaname, tablename 
FROM pg_tables 
WHERE tablename ILIKE '%push_token%';

-- 3. Check for DUPLICATE CONSTRAINTS
-- Maybe the PK is on aDifferent column but NAMED like the user_id?
SELECT 
    conname, 
    pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'app_push_tokens'::regclass;

-- 4. Check for 'Hidden' characters in the UUID
-- (Should show 36 if it's a standard UUID)
SELECT LENGTH(user_id::text), user_id 
FROM app_push_tokens 
WHERE user_id::text LIKE '29864936%';
