-- ============================================================
-- 1. RESTORE CHALLENGE MESSAGE TRIGGER
-- ============================================================
-- This ensures that ANY challenge inserted (manual or auto)
-- immediately creates a chat message from the system bot.

-- A. Safety: Drop any existing overlapping triggers
DROP TRIGGER IF EXISTS on_challenge_created_send_notification ON app_challenges;
DROP TRIGGER IF EXISTS on_challenge_created ON app_challenges;

-- B. Create the Function
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

-- C. Create the Trigger
CREATE TRIGGER on_challenge_created
AFTER INSERT ON app_challenges
FOR EACH ROW
EXECUTE FUNCTION handle_new_challenge();


-- ============================================================
-- 2. UPDATE AUTO-SEND LOGIC (Fixing English Exclusion)
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
        
        -- UPDATED FILTER LOGIC:
        -- Explicitly include English ("english!")
        -- Explicitly exclude specific test groups by keyword
        FOR group_record IN 
            SELECT id, language FROM app_groups 
            WHERE name NOT ILIKE '%app tester%' 
            AND name NOT ILIKE '%noah%'
        LOOP
            IF LOWER(group_record.language) = 'english' THEN
                final_text := '#challenge' || E'\n' || clean_text;
            ELSE
                 -- (In a real scenario, fetch pre-translated text if available, for now falls back to English + TODO)
                 -- Assuming 'challenge_record' might eventually hold translations json, 
                 -- but simpler to just send English format for now or rely on existing behavior.
                final_text := '#challenge' || E'\n' || clean_text;
            END IF;
            
            INSERT INTO app_challenges (group_id, prompt_text, created_by)
            VALUES (
                group_record.id,
                final_text,
                '00000000-0000-0000-0000-000000000000'::UUID
            );
            
            -- Send ONE notification only
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
    END LOOP;
END;
$$;
