-- Create trigger to send push notifications when a new challenge is posted
-- This trigger calls the send-push-notification Edge Function

CREATE OR REPLACE FUNCTION notify_group_of_challenge()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger for challenge messages (messages starting with #challenge)
  IF NEW.message_text LIKE '#challenge%' THEN
    -- Call the Edge Function asynchronously using pg_net
    PERFORM
      net.http_post(
        url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL') || '/functions/v1/send-push-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY')
        ),
        body := jsonb_build_object(
          'record', jsonb_build_object(
            'id', NEW.id,
            'group_id', NEW.group_id,
            'prompt_text', NEW.message_text,
            'sender_id', NEW.sender_id
          )
        )
      );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_challenge_posted ON app_group_messages;

-- Create trigger that fires after a new message is inserted
CREATE TRIGGER on_challenge_posted
  AFTER INSERT ON app_group_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_group_of_challenge();
