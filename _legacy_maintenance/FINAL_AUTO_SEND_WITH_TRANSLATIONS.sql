-- FINAL AUTO-SEND WITH TRANSLATIONS
-- Matches exactly how the dashboard manual send works

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
    translation TEXT;
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
        
        is_first_group := TRUE;
        
        FOR group_record IN 
            SELECT id, language FROM app_groups 
        LOOP
            -- Translate for non-English groups
            IF LOWER(group_record.language) = 'english' THEN
                -- English groups: #challenge\n[text]
                final_text := '#challenge' || E'\n' || clean_text;
            ELSE
                -- Non-English groups: #challenge\n[english]\n[translation]
                -- Call translation edge function
                BEGIN
                    -- Try to translate via edge function
                    -- For now, just send English (we'll add translation API calls next)
                    final_text := '#challenge' || E'\n' || clean_text;
                    
                    RAISE NOTICE 'TODO: Add translation for language: %', group_record.language;
                EXCEPTION WHEN OTHERS THEN
                    -- If translation fails, just send English
                    final_text := '#challenge' || E'\n' || clean_text;
                END;
            END IF;
            
            INSERT INTO app_challenges (group_id, prompt_text, created_by)
            VALUES (
                group_record.id,
                final_text,
                '00000000-0000-0000-0000-000000000000'::UUID
            );
            
            -- Send notification ONLY for the first group (deduplication)
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

-- Update cron job
SELECT cron.unschedule('send-scheduled-challenges');

SELECT cron.schedule(
  'send-scheduled-challenges',
  '* * * * *',
  'SELECT send_due_challenges();'
);

SELECT 'Ready! Auto-send will work with proper #challenge format. Translations TODO.' as status;
