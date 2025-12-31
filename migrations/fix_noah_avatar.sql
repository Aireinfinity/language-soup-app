DO $$
DECLARE
    real_avatar TEXT;
BEGIN
    -- 1. Find a "Real" Avatar (non-Dicebear, non-null) from any of the duplicate 'noah :)' accounts
    SELECT avatar_url INTO real_avatar
    FROM app_users
    WHERE display_name = 'noah :)'
    AND avatar_url IS NOT NULL
    AND avatar_url NOT ILIKE '%dicebear%'
    ORDER BY created_at DESC -- Prefer the most recent real one
    LIMIT 1;

    -- 2. If we found one, update ALL 'noah :)' accounts to use it
    IF real_avatar IS NOT NULL THEN
        RAISE NOTICE 'Found real avatar: %. Updating all noah :) accounts...', real_avatar;
        
        UPDATE app_users
        SET avatar_url = real_avatar
        WHERE display_name = 'noah :)';
    ELSE
        RAISE NOTICE 'No real avatar found for noah :)';
    END IF;
END $$;
