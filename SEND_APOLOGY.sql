-- SEND IMMEDIATE APOLOGY NOTIFICATION
-- This script calculates unique users and sends ONE notification to each.
-- It bypasses all triggers and table inserts.

DO $$
DECLARE
    unique_user_ids UUID[];
BEGIN
    -- 1. Get ALL unique users who are in at least one group (excluding system bot)
    SELECT ARRAY_AGG(DISTINCT user_id)
    INTO unique_user_ids
    FROM app_group_members
    WHERE user_id != '00000000-0000-0000-0000-000000000000'::UUID;

    -- 2. Send the broadcast
    PERFORM net.http_post(
        url := 'https://uspegyneclgkscxwmomn.supabase.co/functions/v1/send-push-notification',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzcGVneW5lY2xna3NjeHdtb21uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjk3NTY1NiwiZXhwIjoyMDQ4NTUxNjU2fQ.9hqZKbmLZJdNWPNlYgDxhPBRZMONEUOzJJxdMhXNZxI'
        ),
        body := jsonb_build_object(
            'userIds', unique_user_ids,
            'title', 'Update from the Founder 🥣',
            'body', 'Im sorry for the spam earlier! working on it 👨‍💻 please dont turn notifications off #beta #solofounder #troubleinparadise'
        )
    );

    RAISE NOTICE '📢 Apology sent to % unique users', array_length(unique_user_ids, 1);
END;
$$;
