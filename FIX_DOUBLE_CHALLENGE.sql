-- FIX: Remove duplicate #challenge text

-- Step 1: Check current challenge text format
SELECT id, challenge_text, scheduled_time, status
FROM app_scheduled_challenges
WHERE status IN ('approved', 'pending')
ORDER BY scheduled_time;

-- Step 2: Update the function to NOT add #challenge if it's already there
CREATE OR REPLACE FUNCTION send_due_challenges()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    challenge_record RECORD;
    group_record RECORD;
    clean_text TEXT;
    final_text TEXT;
    unique_user_ids UUID[];
    is_first_group BOOLEAN;
BEGIN
    FOR challenge_record IN 
        SELECT * FROM app_scheduled_challenges
        WHERE status = 'approved' 
        AND scheduled_time <= NOW()
    LOOP
        -- Remove #challenge prefix if it exists
        clean_text := REGEXP_REPLACE(challenge_record.challenge_text, '^#challenge\\s*', '', 'i');
        
        -- Add #challenge prefix (now guaranteed to be only once)
        final_text := '#challenge' || E'\n' || clean_text;
        
        is_first_group := TRUE;
        
        FOR group_record IN SELECT id FROM app_groups LOOP
            INSERT INTO app_challenges (group_id, prompt_text, created_by)
            VALUES (
                group_record.id,
                final_text,
                '00000000-0000-0000-0000-000000000000'::UUID
            );
            
            IF is_first_group AND NOT COALESCE(challenge_record.notifications_sent, FALSE) THEN
                SELECT ARRAY_AGG(DISTINCT user_id)
                INTO unique_user_ids
                FROM app_group_members
                WHERE user_id != '00000000-0000-0000-0000-000000000000'::UUID;
                
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
                    
                    UPDATE app_scheduled_challenges
                    SET notifications_sent = TRUE
                    WHERE id = challenge_record.id;
                    
                EXCEPTION WHEN OTHERS THEN
                    RAISE NOTICE 'Failed to send notifications: %', SQLERRM;
                END;
                
                is_first_group := FALSE;
            END IF;
        END LOOP;
        
        UPDATE app_scheduled_challenges
        SET status = 'sent'
        WHERE id = challenge_record.id;
        
        RAISE NOTICE 'Sent challenge: %', challenge_record.id;
    END LOOP;
END;
$$;

-- Step 3: Update cron job
SELECT cron.unschedule('send-scheduled-challenges');

SELECT cron.schedule(
  'send-scheduled-challenges',
  '* * * * *',
  'SELECT send_due_challenges();'
);

-- Verify
SELECT 'Fixed! Now challenges will only have ONE #challenge tag' as status;
