-- Create a secure function to send system messages to the Community Group
-- Only admins can call this function

CREATE OR REPLACE FUNCTION send_system_message(message_text TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with permission to bypass RLS
SET search_path = public
AS $$
DECLARE
    system_bot_id UUID := '00000000-0000-0000-0000-000000000000';
    target_group_id UUID;
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

    -- 2. Find the Community Group (Try name 'Community', then language 'Community')
    SELECT id INTO target_group_id
    FROM public.app_groups
    WHERE name = 'Community'
    LIMIT 1;

    IF target_group_id IS NULL THEN
        SELECT id INTO target_group_id
        FROM public.app_groups
        WHERE language = 'Community'
        LIMIT 1;
    END IF;

    IF target_group_id IS NULL THEN
        RAISE EXCEPTION 'Community group not found!';
    END IF;

    -- 3. Insert the message
    INSERT INTO public.app_messages (
        sender_id,
        group_id,
        content,
        message_type,
        created_at,
        language
    )
    VALUES (
        system_bot_id,
        target_group_id,
        message_text,
        'text',
        NOW(),
        'English'
    )
    RETURNING id INTO new_message_id;

    RETURN jsonb_build_object('success', true, 'message_id', new_message_id, 'group_id', target_group_id);
END;
$$;
