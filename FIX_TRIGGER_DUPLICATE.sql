-- FIX: Remove duplicate #challenge from trigger

CREATE OR REPLACE FUNCTION public.handle_new_challenge()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
    group_members RECORD;
    push_token RECORD;
    random_emoji TEXT;
    group_name TEXT;
BEGIN
    -- 1. Insert challenge message from the Language Soup bot
    -- FIXED: Don't add #challenge here - it's already in NEW.prompt_text
    INSERT INTO app_messages (
        group_id,
        sender_id,
        message_type,
        content,
        challenge_id
    )
    VALUES (
        NEW.group_id,
        '00000000-0000-0000-0000-000000000000', -- Language Soup bot
        'text',
        NEW.prompt_text,  -- CHANGED: Removed the '#challenge' || E'\n' || part
        NEW.id
    );
    
    -- 2. Send push notifications to all group members (except creator)
    -- Get group name for notification
    SELECT name INTO group_name FROM app_groups WHERE id = NEW.group_id;
    
    -- Pick random emoji
    random_emoji := (ARRAY['😰', '🥳', '🥹', '😵‍💫', '🌈', '🙀', '🤪', '☺️', '😚', '🤯'])[floor(random() * 10 + 1)];
    
    -- Send notification to each member with a push token
    FOR push_token IN 
        SELECT DISTINCT pt.expo_push_token
        FROM app_group_members gm
        JOIN app_push_tokens pt ON pt.user_id = gm.user_id
        WHERE gm.group_id = NEW.group_id
        AND gm.user_id != NEW.created_by
    LOOP
        -- Call Expo push API using pg_net
        PERFORM net.http_post(
            url := 'https://exp.host/--/api/v2/push/send',
            headers := '{"Content-Type": "application/json"}'::jsonb,
            body := jsonb_build_object(
                'to', push_token.expo_push_token,
                'sound', 'default',
                'title', 'mmm goood soup!',
                'body', random_emoji || ' new challenge in ' || group_name,
                'data', jsonb_build_object(
                    'type', 'challenge',
                    'groupId', NEW.group_id,
                    'challengeId', NEW.id
                )
            )
        );
    END LOOP;
    
    RETURN NEW;
END;
$function$;

-- Verify the fix
SELECT 'Fixed! Trigger will no longer add duplicate #challenge' as status;
