-- ERASE THE DICEBEARS 🐻🔫
-- Deletes duplicate users that have a Dicebear avatar.

DELETE FROM app_users
WHERE id IN (
    SELECT u.id
    FROM app_users u
    JOIN (
        SELECT display_name
        FROM app_users
        GROUP BY display_name
        HAVING COUNT(*) > 1
    ) dup ON u.display_name = dup.display_name
    WHERE u.avatar_url LIKE '%dicebear%'
);

-- Note: Miranda does NOT have a dicebear avatar in your data (both are storage/...), so she is SAFE.
-- Monica, Murgi, and Noah all have one Dicebear copy -> GONE.

SELECT 'Dicebears exterminated. 🐻💀' as status;
