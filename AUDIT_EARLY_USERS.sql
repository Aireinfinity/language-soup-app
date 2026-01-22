-- 🔎 AUDIT TRENDS FOR EARLIEST USERS
-- Looking at the 4 users provided by Noah to find patterns

SELECT 
    u.id,
    u.display_name,
    u.email,
    u.created_at as user_created,
    COUNT(t.expo_push_token) as total_token_rows,
    MAX(t.updated_at) as last_token_update,
    string_agg(DISTINCT t.platform, ', ') as platforms,
    -- Check if they have the same token multiple times or different ones
    COUNT(DISTINCT t.expo_push_token) as unique_token_values
FROM users u
LEFT JOIN app_push_tokens t ON u.id = t.user_id
WHERE u.id IN (
    '29864936-719c-483b-ac6a-4d06084a48fe', -- Noah
    '9b447058-242f-49ab-949a-ab2a704c947d',
    '00743f8e-b2a3-440b-b3ed-f222f81a8b86',
    '8bb1512e-fb36-4826-ba89-a412926413e1'
)
GROUP BY u.id, u.display_name, u.email, u.created_at;

-- Detailed look at their token history
SELECT 
    user_id,
    expo_push_token,
    platform,
    created_at,
    updated_at
FROM app_push_tokens
WHERE user_id IN (
    '29864936-719c-483b-ac6a-4d06084a48fe',
    '9b447058-242f-49ab-949a-ab2a704c947d',
    '00743f8e-b2a3-440b-b3ed-f222f81a8b86',
    '8bb1512e-fb36-4826-ba89-a412926413e1'
)
ORDER BY user_id, updated_at DESC;
