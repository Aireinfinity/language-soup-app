-- Find duplicate user profiles (same display name, different IDs)
-- This helps identify users who got logged out and created new accounts

-- Step 1: Find potential duplicates
SELECT 
    display_name,
    COUNT(*) as profile_count,
    STRING_AGG(id::text, ', ') as user_ids,
    STRING_AGG(created_at::text, ' | ') as created_dates
FROM app_users
WHERE display_name IS NOT NULL 
  AND display_name != ''
  AND display_name NOT ILIKE '%noah%'
  AND display_name NOT ILIKE '%test%'
  AND display_name NOT ILIKE '%bot%'
GROUP BY LOWER(display_name)
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC, display_name;

-- Step 2: For a specific user, see all their profiles
-- Replace 'USER_NAME' with the actual name
/*
SELECT 
    id,
    display_name,
    created_at,
    (SELECT COUNT(*) FROM app_group_members WHERE user_id = app_users.id) as group_count,
    (SELECT COUNT(*) FROM app_messages WHERE sender_id = app_users.id) as message_count,
    (SELECT COUNT(*) FROM app_push_tokens WHERE user_id = app_users.id) as token_count
FROM app_users
WHERE display_name ILIKE '%USER_NAME%'
ORDER BY created_at DESC;
*/
