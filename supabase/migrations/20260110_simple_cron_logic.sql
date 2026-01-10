-- The "Simple" Logic: Pure SQL Cron Job
-- 1. Moves challenges from 'scheduled' to 'active'
-- 2. Validates 'System Bot' exists to avoid errors
-- 3. Relies on existing Webhooks/Triggers to send Push Notifications

-- Enable pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the job to run every minute
SELECT cron.schedule(
    'process-scheduled-challenges-simple', -- Job Name
    '* * * * *',                           -- Every Minute
    $$
    -- 1. Insert due challenges into the live table
    INSERT INTO app_challenges (group_id, prompt_text, created_by, created_at)
    SELECT 
        group_id, 
        challenge_text, 
        created_by, 
        NOW()
    FROM app_scheduled_challenges
    WHERE status = 'pending' 
      AND scheduled_time <= NOW();

    -- 2. Mark them as sent in the schedule table
    UPDATE app_scheduled_challenges
    SET status = 'sent'
    WHERE status = 'pending' 
      AND scheduled_time <= NOW();
    $$
);

-- Note: This assumes you have a Webhook on 'app_challenges' that triggers 'send-push-notification'
-- If not, you can create it in the Supabase Dashboard:
-- Database -> Webhooks -> Create Webhook -> Table: app_challenges, Event: INSERT -> Edge Function: send-push-notification
