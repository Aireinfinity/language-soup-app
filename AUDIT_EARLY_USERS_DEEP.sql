-- 🔎 CHECK ACTUAL TABLE SCHEMA
-- Let's see if user_id is REALLY the Primary Key on the live table.
-- If it is, then the "multiple tokens per user" theory is dead.
SELECT 
    a.attname as column_name,
    format_type(a.atttypid, a.atttypmod) AS data_type,
    i.indisprimary AS is_primary
FROM pg_index i
JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
WHERE i.indrelid = 'app_push_tokens'::regclass;

-- 🔎 CHECK FOR SHARED TOKENS AMONG EARLY USERS
-- Did any of these 4 users at some point share the same token?
SELECT expo_push_token, COUNT(user_id) as assigned_to_users
FROM app_push_tokens
WHERE user_id IN (
    '29864936-719c-483b-ac6a-4d06084a48fe',
    '9b447058-242f-49ab-949a-ab2a704c947d',
    '00743f8e-b2a3-440b-b3ed-f222f81a8b86',
    '8bb1512e-fb36-4826-ba89-a412926413e1'
)
GROUP BY expo_push_token
HAVING COUNT(user_id) > 1;

-- 🔎 CHECK FOR NULLS OR WEIRD DATA
SELECT * 
FROM app_push_tokens 
WHERE user_id IN (
    '29864936-719c-483b-ac6a-4d06084a48fe',
    '9b447058-242f-49ab-949a-ab2a704c947d',
    '00743f8e-b2a3-440b-b3ed-f222f81a8b86',
    '8bb1512e-fb36-4826-ba89-a412926413e1'
);
