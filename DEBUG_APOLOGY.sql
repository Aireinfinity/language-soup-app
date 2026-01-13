-- CORRECTED DEBUG APOLOGY SCRIPT
DO $$
DECLARE
    unique_user_ids UUID[];
    req_id INT;
BEGIN
    -- 1. Get ALL unique users
    SELECT ARRAY_AGG(DISTINCT user_id)
    INTO unique_user_ids
    FROM app_group_members
    WHERE user_id != '00000000-0000-0000-0000-000000000000'::UUID;

    -- CHECK: Are there users?
    IF unique_user_ids IS NULL OR array_length(unique_user_ids, 1) = 0 THEN
        RAISE EXCEPTION '❌ FAILURE: No users found in app_group_members!';
    END IF;

    RAISE NOTICE '📢 Found % unique users. Sending...', array_length(unique_user_ids, 1);

    -- 2. Send the request (capturing ID)
    SELECT net.http_post(
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
    ) INTO req_id;

    RAISE NOTICE '✅ SUCCESS: Request queued with ID: %', req_id;
    RAISE NOTICE '👉 Check net.http_response later with: SELECT * FROM net.http_response WHERE id = %', req_id;

END;
$$;
