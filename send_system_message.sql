-- Create a secure function to send system messages
-- Only admins can call this function

CREATE OR REPLACE FUNCTION send_system_message(message_text TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with permission of the creator (postgres) to bypass RLS
SET search_path = public
AS $$
DECLARE
    system_bot_id UUID := '00000000-0000-0000-0000-000000000000';
    new_message_id UUID;
    caller_is_admin BOOLEAN;
BEGIN
    -- 1. Check if caller is admin
    SELECT is_admin INTO caller_is_admin
    FROM public.app_users
    WHERE id = auth.uid();

    IF caller_is_admin IS NOT TRUE THEN
        RAISE EXCEPTION 'Access Denied: Only admins can send system messages.';
    END IF;

    -- 2. Insert the message as the System Bot
    INSERT INTO public.app_messages (
        sender_id,
        content,
        message_type,
        created_at,
        language
    )
    VALUES (
        system_bot_id,
        message_text,
        'text',
        NOW(),
        'English' -- Default to English for announcements
    )
    RETURNING id INTO new_message_id;

    RETURN jsonb_build_object('success', true, 'message_id', new_message_id);
END;
$$;
