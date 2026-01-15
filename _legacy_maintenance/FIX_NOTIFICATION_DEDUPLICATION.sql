-- PROPER DEDUPLICATION FIX
-- Send notification ONCE when challenge status changes to 'sent'
-- Not once per group insertion

-- Step 1: Remove the broken trigger on app_challenges
DROP TRIGGER IF EXISTS trigger_notify_new_challenge ON app_challenges;
DROP FUNCTION IF EXISTS notify_users_of_new_challenge();

-- Step 2: Create trigger on app_scheduled_challenges instead
CREATE OR REPLACE FUNCTION notify_challenge_sent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    unique_user_ids UUID[];
    random_emojis TEXT[] := ARRAY['😰', '🥳', '🥹', '😵‍💫', '🌈', '🙀', '🤪', '☺️', '😚', '🤯'];
    random_emoji TEXT;
BEGIN
    -- Only proceed if status changed from 'approved' to 'sent'
    IF OLD.status = 'approved' AND NEW.status = 'sent' THEN
        
        -- Get unique user IDs across ALL groups (deduplicated)
        SELECT ARRAY_AGG(DISTINCT user_id)
        INTO unique_user_ids
        FROM app_group_members
        WHERE user_id != '00000000-0000-0000-0000-000000000000'::UUID;
        
        -- Pick random emoji
        random_emoji := random_emojis[floor(random() * array_length(random_emojis, 1) + 1)::int];
        
        -- Call edge function to send notifications (ONE TIME ONLY)
        PERFORM net.http_post(
            url := 'https://uspegyneclgkscxwmomn.supabase.co/functions/v1/send-push-notification',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzcGVneW5lY2xna3NjeHdtb21uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjk3NTY1NiwiZXhwIjoyMDQ4NTUxNjU2fQ.9hqZKbmLZJdNWPNlYgDxhPBRZMONEUOzJJxdMhXNZxI'
            ),
            body := jsonb_build_object(
                'userIds', unique_user_ids,
                'title', 'mmm goood soup!',
                'body', random_emoji || ' new challenges just dropped!'
            )
        );
        
        RAISE NOTICE 'Sent notification to % unique users', array_length(unique_user_ids, 1);
    END IF;
    
    RETURN NEW;
END;
$$;

-- Drop old trigger if exists
DROP TRIGGER IF EXISTS trigger_notify_challenge_sent ON app_scheduled_challenges;

-- Create trigger on app_scheduled_challenges (fires ONCE per challenge)
CREATE TRIGGER trigger_notify_challenge_sent
AFTER UPDATE ON app_scheduled_challenges
FOR EACH ROW
EXECUTE FUNCTION notify_challenge_sent();

-- Verify trigger is created
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgname = 'trigger_notify_challenge_sent';

-- This should show: tgenabled = 'O' (enabled)
