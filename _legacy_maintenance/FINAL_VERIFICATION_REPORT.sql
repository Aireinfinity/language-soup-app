-- FINAL_VERIFICATION_REPORT.sql
-- Run this to get a full report on tomorrow's challenge status.

-- 1. THE CHALLENGE (Is it ready?)
SELECT 
    'Jan 15th Challenge' as label,
    status as current_status,
    scheduled_time AT TIME ZONE 'UTC' as time_utc,
    challenge_text as preview_format
FROM app_scheduled_challenges
WHERE scheduled_time >= '2026-01-15 00:00:00+00'
AND scheduled_time < '2026-01-16 00:00:00+00'
AND status = 'approved';

-- 2. THE CHAT GROUPS (Where will it post?)
-- Based on your current "Beta Mode" Cron:
SELECT count(*) as total_target_groups 
FROM app_groups;

-- 3. THE NOTIFICATIONS (Who gets the alert?)
-- Based on your current "Beta Mode" Cron:
SELECT count(DISTINCT user_id) as total_users_to_notify 
FROM app_group_members 
WHERE user_id != '00000000-0000-0000-0000-000000000000'::UUID;

-- 4. THE PRINTER (Is the trigger alive?)
SELECT 
    trigger_name, 
    '✅ INSTALLED' as status 
FROM information_schema.triggers 
WHERE event_object_table = 'app_challenges' 
AND trigger_name = 'on_challenge_created';
