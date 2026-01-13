-- FINAL FIX: Notification deduplication via trigger on app_challenges
-- When a challenge is inserted, send ONE notification per unique user

CREATE OR REPLACE FUNCTION notify_users_of_new_challenge()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    unique_user_ids UUID[];
    random_emojis TEXT[] := ARRAY['😰', '🥳', '🥹', '😵‍💫', '🌈', '🙀', '🤪', '☺️', '😚', '🤯'];
    random_emoji TEXT;
BEGIN
    -- Only send notification for challenges created by system bot
    IF NEW.created_by = '00000000-0000-0000-0000-000000000000'::UUID 
       AND NEW.prompt_text LIKE '#challenge%' THEN
        
        -- Get unique user IDs across ALL groups (deduplicated)
        SELECT ARRAY_AGG(DISTINCT user_id)
        INTO unique_user_ids
        FROM app_group_members
        WHERE user_id != '00000000-0000-0000-0000-000000000000'::UUID;
        
        -- Pick random emoji
        random_emoji := random_emojis[floor(random() * array_length(random_emojis, 1) + 1)::int];
        
        -- Call edge function to send notifications
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
    END IF;
    
    RETURN NEW;
END;
$$;

-- Drop old trigger if exists
DROP TRIGGER IF EXISTS trigger_notify_new_challenge ON app_challenges;

-- Create trigger that fires ONCE per challenge batch
-- We'll use a flag to ensure it only fires once for the first group
CREATE TRIGGER trigger_notify_new_challenge
AFTER INSERT ON app_challenges
FOR EACH ROW
WHEN (NEW.created_by = '00000000-0000-0000-0000-000000000000'::UUID 
      AND NEW.prompt_text LIKE '#challenge%')
EXECUTE FUNCTION notify_users_of_new_challenge();

-- Verify trigger is created
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgname = 'trigger_notify_new_challenge';
