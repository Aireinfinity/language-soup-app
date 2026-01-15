-- TRUST_THE_DASHBOARD.sql
-- The Dashboard is the brain. It already translated and formatted everything.
-- This script just tells the Auto-Send to use the Dashboard's work.

CREATE OR REPLACE FUNCTION send_due_challenges()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    c RECORD;
    g RECORD;
    u UUID[];
BEGIN
    FOR c IN SELECT * FROM app_scheduled_challenges WHERE status = 'approved' AND scheduled_time <= NOW() LOOP
        
        -- 1. PRINT TO CHATS (The Dashboard Way)
        FOR g IN SELECT id, language FROM app_groups LOOP
            INSERT INTO app_challenges (group_id, prompt_text)
            VALUES (
                g.id, 
                COALESCE(c.translations->>INITCAP(g.language), '#challenge' || E'\n' || c.challenge_text)
            );
        END LOOP;

        -- 2. ALERT PHONES (The Simple Way)
        -- Gets all 120 users and alerts them once.
        SELECT ARRAY_AGG(DISTINCT user_id) INTO u FROM app_group_members WHERE user_id != '00000000-0000-0000-0000-000000000000'::UUID;
        
        PERFORM net.http_post(
            url := 'https://uspegyneclgkscxwmomn.supabase.co/functions/v1/send-push-notification',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzcGVneW5lY2xna3NjeHdtb21uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjk3NTY1NiwiZXhwIjoyMDQ4NTUxNjU2fQ.9hqZKbmLZJdNWPNlYgDxhPBRZMONEUOzJJxdMhXNZxI'
            ),
            body := jsonb_build_object('userIds', u, 'title', 'mmm goood soup!', 'body', '🥳 new challenges just dropped!')
        );

        -- 3. CLEANUP
        UPDATE app_scheduled_challenges SET status = 'sent', notifications_sent = TRUE WHERE id = c.id;
    END LOOP;
END;
$$;

SELECT '✅ DONE. Auto-Send now follows the Dashboard 1:1.' as status;
