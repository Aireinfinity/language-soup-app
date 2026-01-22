-- 🔎 DEEP SCHEMA AUDIT
-- Let's see exactly what is protecting this table (or what isn't)

-- 1. Check for ANY constraints on the table
SELECT
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(c.oid) AS constraint_definition
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
WHERE n.nspname = 'public'
AND conrelid = 'app_push_tokens'::regclass;

-- 2. Check for UNIQUE indexes that aren't formal constraints
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'app_push_tokens';

-- 3. Check for the row volume again
SELECT COUNT(*), COUNT(DISTINCT user_id)
FROM app_push_tokens;
