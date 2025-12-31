-- CLEANUP: Remove duplicate "noah :)" profiles
-- We keep the most recently updated one and delete the rest

DELETE FROM app_users
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY LOWER(display_name) 
                   ORDER BY updated_at DESC, created_at DESC
               ) as rn
        FROM app_users
        WHERE LOWER(display_name) = 'noah :)'
    ) t
    WHERE rn > 1
);

-- Also ensure the surviving Noah is an admin
UPDATE app_users 
SET is_admin = true, 
    is_community_manager = true,
    status_text = 'Founder Daddy'
WHERE LOWER(display_name) = 'noah :)';
