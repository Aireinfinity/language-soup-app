-- SIMPLE ONE-TIME NOTIFICATION
-- No triggers. No fancy logic. Just send ONE notification to each unique user.

DO $$
DECLARE
    -- 1. Gather Unique Users
    unique_user_ids UUID[] := ARRAY(
        SELECT DISTINCT user_id 
        FROM app_group_members 
        WHERE user_id != '00000000-0000-0000-0000-000000000000'::UUID
    );
BEGIN
    -- 2. Send the call
    PERFORM net.http_post(
        url := 'https://uspegyneclgkscxwmomn.supabase.co/functions/v1/send-push-notification',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzcGVneW5lY2xna3NjeHdtb21uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjk3NTY1NiwiZXhwIjoyMDQ4NTUxNjU2fQ.9hqZKbmLZJdNWPNlYgDxhPBRZMONEUOzJJxdMhXNZxI'
        ),
        body := jsonb_build_object(
            'userIds', unique_user_ids,
            'title', 'Update 🥣',
            'body', 'sorry fixing notification spam 👨‍💻 one ping only now!'
        )
    );
    
    RAISE NOTICE 'Sent to % users.', array_length(unique_user_ids, 1);
END;
$$;
