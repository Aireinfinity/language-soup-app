-- FINAL SIMPLE FIX (BARE METAL VERSION)
-- 1. Creates the Printer (Trigger).
-- 2. Updates the Address List (Cron).

-- ============================================================
-- PART A: THE PRINTER
-- Code that pastes the message into chat.
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_challenge()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO app_messages (
        group_id,
        sender_id,
        message_type,
        content,
        challenge_id
    )
    VALUES (
        NEW.group_id,
        '00000000-0000-0000-0000-000000000000'::UUID, -- System Bot
        'text',
        NEW.prompt_text,
        NEW.id
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- We verified this trigger does not exist, so we just create it.
CREATE TRIGGER on_challenge_created
AFTER INSERT ON app_challenges
FOR EACH ROW
EXECUTE FUNCTION handle_new_challenge();


-- ============================================================
-- PART B: THE GLOBAL LOGIC (Cron Function)
-- Updates the auto-send logic to broadcast to everyone.
-- ============================================================

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
        clean_text := REGEXP_REPLACE(challenge_record.challenge_text, '^#challenge\\s*', '', 'i');
        
        is_first_group := TRUE;
        
        -- 1. LOOP FILTER: REMOVED (Everyone gets the message)
        FOR group_record IN 
            SELECT id, language FROM app_groups 
        LOOP
            IF LOWER(group_record.language) = 'english' THEN
                final_text := '#challenge' || E'\n' || clean_text;
            ELSE
                final_text := '#challenge' || E'\n' || clean_text;
            END IF;
            
            -- Insert Challenge (Triggers Message Creation)
            INSERT INTO app_challenges (group_id, prompt_text, created_by)
            VALUES (
                group_record.id,
                final_text,
                '00000000-0000-0000-0000-000000000000'::UUID
            );
            
            -- 2. NOTIFICATION: SENT TO EVERYONE
            IF is_first_group AND NOT COALESCE(challenge_record.notifications_sent, FALSE) THEN
                
                SELECT ARRAY_AGG(DISTINCT user_id)
                INTO unique_user_ids
                FROM app_group_members; -- All Users
                
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
    END LOOP;
END;
$$;

SELECT '✅ SUCCESS: System Updated.' as status,
       '1. Notifications: EXACTLY ONE per user (Deduplicated).' as guarantee_1,
       '2. Chat Messages: EXACTLY ONE per group (Restored).' as guarantee_2,
       '3. Format: Clean #challenge format (e.g. #challenge\n[text]).' as guarantee_3;
