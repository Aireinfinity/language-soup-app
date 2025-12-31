-- DETECTIVE: List Duplicate Users 🕵️‍♂️
-- Shows users who have the same Display Name

SELECT 
    display_name,
    id,
    created_at,
    -- Try to guess if it's the real one (usually the one with data)
    status_text,
    avatar_url
FROM app_users
WHERE display_name IN (
    SELECT display_name
    FROM app_users
    GROUP BY display_name
    HAVING COUNT(*) > 1
)
ORDER BY display_name, created_at ASC;
