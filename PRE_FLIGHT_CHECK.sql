-- ✅ PRE-FLIGHT CHECKLIST (UNIFIED OUTPUT)
-- Run this to see all checks in one table

SELECT '1. TEST FUNCTION' as check_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'process_scheduled_challenges_test')
        THEN '✅ EXISTS' ELSE '❌ NOT FOUND - Run CREATE_TEST_FUNCTION.sql'
    END as status

UNION ALL

SELECT '2. PROD FUNCTION',
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'process_scheduled_challenges_prod')
        THEN '✅ EXISTS' ELSE '❌ NOT FOUND - Run CREATE_PROD_FUNCTION.sql'
    END

UNION ALL

SELECT '3. TEST GROUP',
    CASE 
        WHEN EXISTS (SELECT 1 FROM app_groups WHERE id = '439ffe03-96fa-41d3-96f1-c0a8a779ce9d')
        THEN '✅ EXISTS' ELSE '❌ NOT FOUND'
    END

UNION ALL

SELECT '4. NOAH TOKEN',
    CASE 
        WHEN EXISTS (SELECT 1 FROM app_push_tokens WHERE user_id = '29864936-719c-483b-ac6a-4d06084a48fe')
        THEN '✅ EXISTS' ELSE '❌ NOT FOUND - Register for notifications'
    END

UNION ALL

SELECT '5. TEST CHALLENGE',
    CASE 
        WHEN EXISTS (SELECT 1 FROM app_scheduled_challenges WHERE status = 'approved')
        THEN '✅ READY' ELSE '❌ NO CHALLENGE - Schedule one in dashboard'
    END

UNION ALL

SELECT '6. CRON STATUS',
    CASE 
        WHEN EXISTS (SELECT 1 FROM cron.job WHERE jobid = 13 AND active = false)
        THEN '✅ DISABLED (SAFE)' ELSE '⚠️ STILL ACTIVE'
    END

UNION ALL

SELECT '7. READY TO TEST?',
    CASE 
        WHEN (
            SELECT COUNT(*) = 5 FROM (
                SELECT 1 WHERE EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'process_scheduled_challenges_test')
                UNION ALL SELECT 1 WHERE EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'process_scheduled_challenges_prod')
                UNION ALL SELECT 1 WHERE EXISTS (SELECT 1 FROM app_groups WHERE id = '439ffe03-96fa-41d3-96f1-c0a8a779ce9d')
                UNION ALL SELECT 1 WHERE EXISTS (SELECT 1 FROM app_push_tokens WHERE user_id = '29864936-719c-483b-ac6a-4d06084a48fe')
                UNION ALL SELECT 1 WHERE EXISTS (SELECT 1 FROM app_scheduled_challenges WHERE status = 'approved')
            ) checks
        ) THEN '✅ ALL SYSTEMS GO!' ELSE '❌ FIX ISSUES ABOVE'
    END;
