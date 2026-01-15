-- THE_MASTER_CHECK.sql
-- Run this one script. It gives you ONE row with the whole truth.

SELECT 
    (SELECT count(*) FROM app_scheduled_challenges 
     WHERE status = 'approved' 
     AND scheduled_time >= '2026-01-15 00:00:00+00' 
     AND scheduled_time < '2026-01-16 00:00:00+00') as challenge_ready_tomorrow,
    
    (SELECT count(*) FROM app_groups) as total_groups_to_receive,
    
    (SELECT count(DISTINCT user_id) FROM app_group_members 
     WHERE user_id != '00000000-0000-0000-0000-000000000000'::UUID) as users_receiving_notification,
    
    (SELECT CASE WHEN count(*) > 0 THEN '✅ INSTALLED' ELSE '❌ MISSING' END 
     FROM information_schema.triggers 
     WHERE event_object_table = 'app_challenges' 
     AND trigger_name = 'on_challenge_created') as message_printer_status;
