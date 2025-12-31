-- SMART CLEANUP: Delete Empty Duplicates 🧹
-- Logic: For users with the same name, DELETE the one that has NO languages set (the "Ghost").

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
    WHERE u.fluent_languages IS NULL 
       OR u.fluent_languages = '{}'::text[] -- Handle empty array just in case
);

-- Note: This is SAFE because it only targets users with NO languages set.
-- Your "Real" users (Monica, Murgi, Noah) all have languages.
-- "Miranda" has 2 users but BOTH have languages, so this script will safely SKIP her (which is good, manual review needed for her).

SELECT 'Ghosts busted! 👻🚫' as status;
