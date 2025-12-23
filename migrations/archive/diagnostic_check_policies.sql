-- ============================================
-- Diagnostic: Check ALL RLS policies on app_messages
-- Run this to see what policies exist
-- ============================================

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'app_messages';

-- To completely reset (NUCLEAR OPTION - use carefully):
-- ALTER TABLE app_messages DISABLE ROW LEVEL SECURITY;
-- Then re-enable with only the policy we want
