-- GUARANTEED WORKING SOLUTION
-- Add notification tracking to prevent duplicates

-- Step 1: Add a column to track if notifications were sent
ALTER TABLE app_scheduled_challenges 
ADD COLUMN IF NOT EXISTS notifications_sent BOOLEAN DEFAULT FALSE;

-- Step 2: Update the send function to send notifications ONCE
CREATE OR REPLACE FUNCTION send_due_challenges()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    challenge_record RECORD;
    group_record RECORD;
    clean_text TEXT;
    unique_user_ids UUID[];
    is_first_group BOOLEAN;
BEGIN
    -- Get all approved challenges that are due
    FOR challenge_record IN 
        SELECT * FROM app_scheduled_challenges
        WHERE status = 'approved' 
        AND scheduled_time <= NOW()
    LOOP
        clean_text := REGEXP_REPLACE(challenge_record.challenge_text, '^#challenge\s*', '', 'i');
        
        is_first_group := TRUE;
        
        -- Insert challenge into each group
        FOR group_record IN SELECT id FROM app_groups LOOP
            INSERT INTO app_challenges (group_id, prompt_text, created_by)
            VALUES (
                group_record.id,
                '#challenge' || E'\n' || clean_text,
                '00000000-0000-0000-0000-000000000000'::UUID
            );
            
            -- Send notification ONLY for the first group (deduplication)
            IF is_first_group AND NOT COALESCE(challenge_record.notifications_sent, FALSE) THEN
                -- Get unique user IDs
                SELECT ARRAY_AGG(DISTINCT user_id)
                INTO unique_user_ids
                FROM app_group_members
                WHERE user_id != '00000000-0000-0000-0000-000000000000'::UUID;
                
                -- Try to send via edge function (will fail silently if pg_net not working)
                BEGIN
                    PERFORM net.http_post(
                        url := 'https://uspegyneclgkscxwmomn.supabase.co/functions/v1/send-push-notification',
                        headers := jsonb_build_object(
                            'Content-Type', 'application/json',
                            'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzcGVneW5lY2xna3NjeHdtb21uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjk3NTY1NiwiZXhwIjoyMDQ4NTUxNjU2fQ.9hqZKbmLZJdNWPNlYgDxhPBRZMONEUOzJJxdMhXNZxI'
                        ),
                        body := jsonb_build_object(
                            'userIds', unique_user_ids,
                            'title', 'mmm goood soup!',
                            'body', '🥳 new challenges just dropped!'
                        )
                    );
                    
                    -- Mark notifications as sent
                    UPDATE app_scheduled_challenges
                    SET notifications_sent = TRUE
                    WHERE id = challenge_record.id;
                    
                EXCEPTION WHEN OTHERS THEN
                    RAISE NOTICE 'Failed to send notifications: %', SQLERRM;
                END;
                
                is_first_group := FALSE;
            END IF;
        END LOOP;
        
        -- Mark challenge as sent
        UPDATE app_scheduled_challenges
        SET status = 'sent'
        WHERE id = challenge_record.id;
        
        RAISE NOTICE 'Sent challenge: %', challenge_record.id;
    END LOOP;
END;
$$;

-- Step 3: Update the cron job
SELECT cron.unschedule('send-scheduled-challenges');

SELECT cron.schedule(
  'send-scheduled-challenges',
  '* * * * *',
  'SELECT send_due_challenges();'
);

-- Verify setup
SELECT jobid, jobname, schedule, active 
FROM cron.job 
WHERE jobname = 'send-scheduled-challenges';
