-- 🔎 DEEP TREND AUDIT: The "Old Guard" Cleanup
-- Checking for tokens shared between different accounts

SELECT 
    t.expo_push_token,
    COUNT(DISTINCT t.user_id) as assigned_to_accounts,
    string_agg(u.display_name || ' (' || u.id::text || ')', ' | ') as account_details,
    MAX(t.updated_at) as last_seen
FROM app_push_tokens t
JOIN app_users u ON t.user_id = u.id
WHERE t.user_id IN (
    '29864936-719c-483b-ac6a-4d06084a48fe',
    '9b447058-242f-49ab-949a-ab2a704c947d',
    '00743f8e-b2a3-440b-b3ed-f222f81a8b86',
    '8bb1512e-fb36-4826-ba89-a412926413e1',
    '26d90cc6-2d3e-43ca-bf71-60f51dbf3e44' -- Eva
)
GROUP BY t.expo_push_token
HAVING COUNT(DISTINCT t.user_id) > 0; -- Show all for these users

-- 🔎 CHECK FOR "GHOST" ACCOUNTS (Same Display Name, Different IDs)
SELECT 
    display_name, 
    COUNT(*) as id_count, 
    string_agg(id::text, ' | ') as user_ids,
    string_agg(created_at::text, ' | ') as join_dates
FROM app_users
WHERE display_name IN (
    SELECT display_name FROM app_users WHERE id IN (
        '29864936-719c-483b-ac6a-4d06084a48fe',
        '9b447058-242f-49ab-949a-ab2a704c947d',
        '00743f8e-b2a3-440b-b3ed-f222f81a8b86',
        '8bb1512e-fb36-4826-ba89-a412926413e1',
        '26d90cc6-2d3e-43ca-bf71-60f51dbf3e44'
    )
)
GROUP BY display_name
HAVING COUNT(*) > 1;
