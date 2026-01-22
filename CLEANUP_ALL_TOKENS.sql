-- 1. Perform the cleanup using internal Row IDs (ctid)
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

-- 2. Try to ENFORCE the Primary Key
-- This makes it impossible for this to happen again.
-- (We use a DO block in case it already exists)
DO $$
BEGIN
    -- Only try to add if it doesn't have a PK
    IF NOT EXISTS (
        SELECT 1 FROM pg_index i 
        JOIN pg_class c ON c.oid = i.indrelid 
        WHERE c.relname = 'app_push_tokens' AND i.indisprimary
    ) THEN
        ALTER TABLE app_push_tokens ADD PRIMARY KEY (user_id);
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not set PK (maybe it already exists or there is a conflict): %', SQLERRM;
END $$;

SELECT 'Cleanup complete! John is down to 1 token. 🧹✨' as status;
