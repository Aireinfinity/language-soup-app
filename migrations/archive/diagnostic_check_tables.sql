-- Diagnostic: Check if parent tables exist
-- Run this first to see which tables are missing

SELECT 
    'app_messages' as table_name,
    EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'app_messages'
    ) as exists
UNION ALL
SELECT 
    'app_community_messages',
    EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'app_community_messages'
    )
UNION ALL
SELECT 
    'app_support_messages',
    EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'app_support_messages'
    );

-- If any return false, you need to create those tables first
-- Then check if reaction tables already exist:

SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE '%reaction%';
