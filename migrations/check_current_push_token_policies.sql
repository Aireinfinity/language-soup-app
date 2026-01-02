-- Check current RLS policies on app_push_tokens
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'app_push_tokens'
ORDER BY policyname;
