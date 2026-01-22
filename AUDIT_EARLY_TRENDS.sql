-- 🔎 THE "TREND" AUDIT
-- Checking for duplicate IDs for the same Email/Name among early users

SELECT 
    u.display_name,
    u.email,
    COUNT(u.id) as id_count,
    string_agg(u.id::text, ' | ') as user_ids,
    string_agg(u.created_at::text, ' | ') as join_dates
FROM app_users u
WHERE u.display_name IN (
    SELECT display_name FROM app_users WHERE id IN (
        '29864936-719c-483b-ac6a-4d06084a48fe',
        '9b447058-242f-49ab-949a-ab2a704c947d',
        '00743f8e-b2a3-440b-b3ed-f222f81a8b86',
        '8bb1512e-fb36-4826-ba89-a412926413e1',
        '26d90cc6-2d3e-43ca-bf71-60f51dbf3e44' -- Eva
    )
)
GROUP BY u.display_name, u.email
HAVING COUNT(u.id) > 1;

-- 🔎 CHECK TOKEN MAPPING
-- Are their tokens mapped to their NEWEST ID or an OLD one?
SELECT 
    u.display_name,
    u.id as user_id,
    u.created_at as account_created,
    t.expo_push_token,
    t.updated_at as token_updated
FROM app_users u
LEFT JOIN app_push_tokens t ON u.id = t.user_id
WHERE u.display_name IN (
    SELECT display_name FROM app_users WHERE id IN (
        '29864936-719c-483b-ac6a-4d06084a48fe',
        '9b447058-242f-49ab-949a-ab2a704c947d',
        '00743f8e-b2a3-440b-b3ed-f222f81a8b86',
        '8bb1512e-fb36-4826-ba89-a412926413e1',
        '26d90cc6-2d3e-43ca-bf71-60f51dbf3e44'
    )
)
ORDER BY u.display_name, u.created_at DESC;
