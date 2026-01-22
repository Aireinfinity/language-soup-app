-- 🔎 THE "OLD GUARD" MASTER AUDIT (FIXED AGAIN)
-- Checking for Identity Splits and Token Mappings
-- Removed 'email' since it's not in public.app_users

SELECT 
    u.id as app_user_id, 
    u.display_name, 
    u.created_at as account_created,
    u.is_admin,
    t.expo_push_token,
    t.updated_at as last_token_refresh,
    (SELECT COUNT(*) FROM app_group_members WHERE user_id = u.id) as group_count
FROM app_users u
LEFT JOIN app_push_tokens t ON u.id = t.user_id
WHERE u.id IN (
    '29864936-719c-483b-ac6a-4d06084a48fe', -- Noah
    '9b447058-242f-49ab-949a-ab2a704c947d',
    '00743f8e-b2a3-440b-b3ed-f222f81a8b86',
    '8bb1512e-fb36-4826-ba89-a412926413e1',
    '26d90cc6-2d3e-43ca-bf71-60f51dbf3e44'  -- Eva
)
OR u.display_name IN (
    SELECT display_name FROM app_users WHERE id IN (
        '29864936-719c-483b-ac6a-4d06084a48fe',
        '9b447058-242f-49ab-949a-ab2a704c947d',
        '00743f8e-b2a3-440b-b3ed-f222f81a8b86',
        '8bb1512e-fb36-4826-ba89-a412926413e1',
        '26d90cc6-2d3e-43ca-bf71-60f51dbf3e44'
    )
)
ORDER BY u.display_name, u.created_at ASC;
