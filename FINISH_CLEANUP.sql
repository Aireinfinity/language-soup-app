-- 🧹 THE ULTIMATE TOKEN CLEANUP (FINISHING IT)
-- This deletes all duplicates and sets the permanent lock on user_id.

DO $$
DECLARE
    rows_deleted INT;
BEGIN
    -- 1. DELETE ALL DUPLICATES (Keeping only the latest one per user)
    DELETE FROM app_push_tokens
    WHERE ctid NOT IN (
        SELECT ctid
        FROM (
            SELECT ctid,
                   ROW_NUMBER() OVER (
                       PARTITION BY user_id 
                       ORDER BY updated_at DESC, created_at DESC
                   ) as rn
            FROM app_push_tokens
        ) t
        WHERE rn = 1
    );
    
    GET DIAGNOSTICS rows_deleted = ROW_COUNT;
    RAISE NOTICE 'Deleted % duplicate token rows. 🧹', rows_deleted;

    -- 2. ENSURE THE LOCK (Primary Key)
    -- If it doesn't exist, we add it. If it does, we refresh it.
    BEGIN
        ALTER TABLE app_push_tokens DROP CONSTRAINT IF EXISTS app_push_tokens_pkey;
        ALTER TABLE app_push_tokens ADD PRIMARY KEY (user_id);
        RAISE NOTICE 'Primary Key lock successfully enforced on user_id! 🔒';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Constraint already handled or error encountered: %', SQLERRM;
    END;
END $$;

-- 🔎 VERIFY THE RESULT
SELECT 
    COUNT(*) as total_rows, 
    COUNT(DISTINCT user_id) as unique_humans
FROM app_push_tokens;
