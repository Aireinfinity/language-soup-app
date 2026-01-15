-- CONNECT_THE_TRANSLATION_WIRES.sql
-- The Dashboard is Smart. It made the translations.
-- This script just tells the Database to look at those translations for each group.

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
    language_name TEXT;
    unique_user_ids UUID[];
    is_first_group BOOLEAN;
BEGIN
    FOR challenge_record IN 
        SELECT * FROM app_scheduled_challenges
        WHERE status = 'approved' 
        AND scheduled_time <= NOW()
    LOOP
        is_first_group := TRUE;
        
        -- Loop through every group
        FOR group_record IN 
            SELECT id, language FROM app_groups 
        LOOP
            language_name := INITCAP(group_record.language);
            
            -- THE MAGIC LINE:
            -- Use the translation from the Dashboard's "Smart Box" if it exists.
            -- If not, fallback to the English text.
            final_text := COALESCE(
                challenge_record.translations->>language_name, 
                '#challenge' || E'\n' || challenge_record.challenge_text
            );
            
            -- Insert Challenge (The Trigger will print it to chat)
            INSERT INTO app_challenges (group_id, prompt_text, created_by)
            VALUES (
                group_record.id,
                final_text,
                '00000000-0000-0000-0000-000000000000'::UUID
            );
            
            -- Send ONE notification to everyone
            IF is_first_group AND NOT COALESCE(challenge_record.notifications_sent, FALSE) THEN
                SELECT ARRAY_AGG(DISTINCT user_id) INTO unique_user_ids FROM app_group_members;
                
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
                
                UPDATE app_scheduled_challenges SET notifications_sent = TRUE WHERE id = challenge_record.id;
                is_first_group := FALSE;
            END IF;
        END LOOP;
        
        UPDATE app_scheduled_challenges SET status = 'sent' WHERE id = challenge_record.id;
    END LOOP;
END;
$$;

SELECT '✅ DONE. The automated mailman now reads the Dashboard''s translations.' as status;
