-- Check if there's a trigger on app_challenges that's causing the issue
-- Run this to see all triggers on the table

SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'app_challenges';

-- If there's a trigger trying to set created_by, we need to either:
-- 1. Drop the trigger
-- 2. Add created_by column to the table
-- 3. Modify the trigger to not require created_by

-- Option 1: Check if created_by column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'app_challenges';

-- Option 2: If you want to add created_by column (recommended)
-- ALTER TABLE app_challenges ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Option 3: If there's a problematic trigger, drop it
-- DROP TRIGGER IF EXISTS set_created_by ON app_challenges;
