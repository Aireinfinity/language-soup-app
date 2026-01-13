-- VERIFICATION CHECKLIST FOR AUTO-SEND

-- ✅ CHECK 1: Cron job is active and calling edge function
SELECT 
    jobid, 
    jobname, 
    schedule, 
    active,
    command,
    CASE 
        WHEN active = true AND command LIKE '%auto-send-challenges%' THEN '✅ CORRECT'
        ELSE '❌ WRONG'
    END as status
FROM cron.job 
WHERE jobname = 'auto-send-challenges';
-- Expected: active=true, command contains 'auto-send-challenges'

-- ✅ CHECK 2: Tomorrow's challenge is approved
SELECT 
    id,
    challenge_text,
    scheduled_time,
    status,
    CASE 
        WHEN status = 'approved' THEN '✅ READY'
        ELSE '❌ NOT APPROVED'
    END as ready_status
FROM app_scheduled_challenges
WHERE scheduled_time > NOW()
AND scheduled_time < NOW() + INTERVAL '2 days'
ORDER BY scheduled_time;
-- Expected: status='approved'

-- ✅ CHECK 3: Trigger is fixed (no duplicate #challenge)
SELECT 
    proname as function_name,
    CASE 
        WHEN prosrc LIKE '%#challenge%' || E'%\\n%' || '%NEW.prompt_text%' THEN '❌ WILL ADD DUPLICATE'
        WHEN prosrc LIKE '%NEW.prompt_text%' AND prosrc NOT LIKE '%#challenge%' THEN '✅ CORRECT'
        ELSE '⚠️ CHECK MANUALLY'
    END as status
FROM pg_proc
WHERE proname = 'handle_new_challenge';
-- Expected: Should NOT add #challenge prefix

-- ✅ CHECK 4: Edge function exists
-- (Can't check from SQL, but we deployed it)

-- ✅ CHECK 5: Groups exist
SELECT COUNT(*) as total_groups FROM app_groups;
-- Expected: 26 groups

-- 🎯 SUMMARY
SELECT 
    'All checks complete! Review results above.' as message,
    'If all show ✅, auto-send is ready for tomorrow!' as next_step;
