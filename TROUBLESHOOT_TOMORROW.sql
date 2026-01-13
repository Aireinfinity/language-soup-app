-- TROUBLESHOOTING GUIDE: Check logs if auto-send doesn't work tomorrow

-- 📋 CHECK 1: Edge Function Logs
-- Go to: https://supabase.com/dashboard/project/uspegyneclgkscxwmomn/functions
-- Click on "auto-send-challenges"
-- Click "Logs" tab
-- Look for logs around 19:55 UTC (7:55 PM your time)
-- Should see: "🤖 Auto-send triggered" and "✅ Challenge sent to 26 groups"

-- 📋 CHECK 2: Cron Job Execution History
SELECT 
    runid,
    jobid,
    status,
    return_message,
    start_time,
    end_time
FROM cron.job_run_details
WHERE jobid = 12  -- The auto-send-challenges job
AND start_time >= '2026-01-13 19:50:00+00'  -- 5 minutes before scheduled time
AND start_time <= '2026-01-13 20:00:00+00'  -- 5 minutes after
ORDER BY start_time DESC;
-- Expected: Multiple rows (runs every minute), status should be 'succeeded'

-- 📋 CHECK 3: Was challenge marked as sent?
SELECT 
    id,
    challenge_text,
    scheduled_time,
    status,
    updated_at
FROM app_scheduled_challenges
WHERE id = '38e800d6-1295-4e7c-a010-00f78e6b0d1d';
-- Expected: status = 'sent', updated_at around 19:55 UTC

-- 📋 CHECK 4: Were challenges inserted into groups?
SELECT 
    COUNT(*) as challenges_sent,
    MIN(created_at) as first_sent,
    MAX(created_at) as last_sent
FROM app_challenges
WHERE created_at >= '2026-01-13 19:50:00+00'
AND created_at <= '2026-01-13 20:00:00+00'
AND created_by = '00000000-0000-0000-0000-000000000000';
-- Expected: challenges_sent = 26 (one per group)

-- 📋 CHECK 5: Sample challenge to verify format
SELECT 
    group_id,
    prompt_text,
    created_at
FROM app_challenges
WHERE created_at >= '2026-01-13 19:50:00+00'
AND created_at <= '2026-01-13 20:00:00+00'
AND created_by = '00000000-0000-0000-0000-000000000000'
LIMIT 3;
-- Expected: prompt_text should have #challenge\n[english]\n[translation]

-- 🎯 QUICK SUMMARY
SELECT 
    'Run these checks in order if auto-send fails tomorrow' as guide,
    'Start with edge function logs in Supabase dashboard' as step_1,
    'Then run the SQL queries above' as step_2;
