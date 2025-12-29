-- =========================================================
-- PUSH NOTIFICATION TRIGGER FOR CHALLENGES
-- =========================================================
-- This trigger calls the Supabase Edge Function to send
-- push notifications when a new challenge is created

-- 1. Create the trigger function
CREATE OR REPLACE FUNCTION trigger_challenge_push_notification()
RETURNS TRIGGER AS $$
DECLARE
  request_id bigint;
BEGIN
  -- Call the Edge Function via pg_net (Supabase's HTTP extension)
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key')
    ),
    body := jsonb_build_object(
      'record', row_to_json(NEW)
    )
  ) INTO request_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the trigger
DROP TRIGGER IF EXISTS on_challenge_created_send_notification ON app_challenges;

CREATE TRIGGER on_challenge_created_send_notification
  AFTER INSERT ON app_challenges
  FOR EACH ROW
  EXECUTE FUNCTION trigger_challenge_push_notification();

-- =========================================================
-- SETUP INSTRUCTIONS:
-- =========================================================
-- Before running this trigger, you need to set the app settings:
-- 
-- ALTER DATABASE postgres SET app.settings.supabase_url = 'https://your-project.supabase.co';
-- ALTER DATABASE postgres SET app.settings.supabase_service_role_key = 'your-service-role-key';
--
-- Replace with your actual Supabase project URL and service role key
-- =========================================================
