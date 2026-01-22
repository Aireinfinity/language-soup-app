-- 🔎 COMPREHENSIVE TREND AUDIT (CORRECTED)
-- For the 4 early users provided by Noah

SELECT 
    u.id,
    u.display_name,
    u.created_at as user_joining_date,
    t.expo_push_token,
    t.platform,
    t.updated_at as last_token_refresh,
    -- Check for notification preferences (if they exist)
    p.push_enabled,
    p.new_challenges,
    -- See if they have any recorded notifications in the history
    (SELECT COUNT(*) FROM app_notifications WHERE user_id = u.id) as notification_history_count
FROM app_users u
LEFT JOIN app_push_tokens t ON u.id = t.user_id
LEFT JOIN app_notification_preferences p ON u.id = p.user_id
WHERE u.id IN (
    '29864936-719c-483b-ac6a-4d06084a48fe', -- Noah
    '9b447058-242f-49ab-949a-ab2a704c947d',
    '00743f8e-b2a3-440b-b3ed-f222f81a8b86',
    '8bb1512e-fb36-4826-ba89-a412926413e1'
);

-- 🔎 CHECK FOR "GHOST" TOKENS
SELECT 
    expo_push_token,
    COUNT(*) as instances,
    string_agg(user_id::text, ', ') as user_ids
FROM app_push_tokens
WHERE user_id IN (
    '29864936-719c-483b-ac6a-4d06084a48fe',
    '9b447058-242f-49ab-949a-ab2a704c947d',
    '00743f8e-b2a3-440b-b3ed-f222f81a8b86',
    '8bb1512e-fb36-4826-ba89-a412926413e1'
)
GROUP BY expo_push_token;
