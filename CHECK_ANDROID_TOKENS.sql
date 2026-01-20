-- Quick Android Notification Diagnostic
-- Run this in Supabase SQL Editor

-- 1. Check all platforms with tokens
SELECT 
    pt.platform,
    COUNT(DISTINCT pt.user_id) as users_with_tokens,
    COUNT(*) as total_tokens,
    MAX(pt.updated_at) as last_token_update
FROM app_push_tokens pt
GROUP BY pt.platform
ORDER BY pt.platform;

-- 2. Check Noah's tokens (all platforms)
SELECT 
    u.display_name,
    pt.expo_push_token,
    pt.platform,
    pt.updated_at as token_registered,
    np.push_enabled,
    np.new_challenges
FROM app_users u
LEFT JOIN app_push_tokens pt ON u.id = pt.user_id
LEFT JOIN app_notification_preferences np ON u.id = np.user_id
WHERE u.display_name ILIKE '%noah%'
ORDER BY pt.platform;

-- 3. Check recent notifications by platform
SELECT 
    u.display_name,
    pt.platform,
    n.title,
    n.sent_at
FROM app_notifications n
JOIN app_users u ON n.user_id = u.id
LEFT JOIN app_push_tokens pt ON u.id = pt.user_id
WHERE n.sent_at > NOW() - INTERVAL '1 day'
  AND u.display_name ILIKE '%noah%'
ORDER BY n.sent_at DESC;
