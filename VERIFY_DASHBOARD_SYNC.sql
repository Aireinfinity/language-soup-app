-- VERIFY_DASHBOARD_SYNC.sql
-- Run this AFTER running TRUST_THE_DASHBOARD.sql to confirm the sync.

SELECT 
    -- 1. Check if the "Auto-Send" logic now knows about translations
    (SELECT count(*) FROM pg_proc 
     WHERE proname = 'send_due_challenges' 
     AND prosrc ILIKE '%translations->>INITCAP%') > 0 as dashboard_sync_active,

    -- 2. Confirm Jan 15th is still approved
    (SELECT count(*) FROM app_scheduled_challenges 
     WHERE status = 'approved' 
     AND scheduled_time >= '2026-01-15 00:00:00+00' 
     AND scheduled_time < '2026-01-16 00:00:00+00') as challenge_ready_tomorrow,

    -- 3. Confirm the Printer is healthy
    (SELECT CASE WHEN count(*) > 0 THEN '✅ OK' ELSE '❌ ERROR' END 
     FROM information_schema.triggers 
     WHERE event_object_table = 'app_challenges' 
     AND trigger_name = 'on_challenge_created') as message_printer_status;
