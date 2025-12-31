-- =========================================================
-- COMPLETE FIX: Simple trigger that handles EVERYTHING
-- =========================================================
-- This trigger:
-- 1. Creates message from bot
-- 2. Sends push notifications
-- All in one place, no duplicates!
-- =========================================================

-- Update the trigger function to handle notifications too
CREATE OR REPLACE FUNCTION handle_new_challenge()
RETURNS TRIGGER AS $$
DECLARE
    group_members RECORD;
    push_token RECORD;
    random_emoji TEXT;
    group_name TEXT;
BEGIN
    -- 1. Insert challenge message from the Language Soup bot
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
        '#challenge' || E'\n' || NEW.prompt_text,
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
$$ LANGUAGE plpgsql;

-- The trigger stays the same - just the function is updated
-- =========================================================

-- Update bot profile: add emoji, remove flags, set avatar
UPDATE app_users 
SET 
    display_name = 'language soup 🤪',
    avatar_url = 'https://uspegyneclgkscxwmomn.supabase.co/storage/v1/object/public/avatars/00000000-0000-0000-0000-000000000000/bot-avatar.png',
    learning_languages = ARRAY[]::text[],
    fluent_languages = ARRAY[]::text[]
WHERE id = '00000000-0000-0000-0000-000000000000';

-- =========================================================
-- DONE! ✅
-- - Dashboard just inserts challenge
-- - Trigger creates message from bot
-- - Trigger sends notifications
-- - Bot has soup icon + emoji name
-- - No language flags
-- - No duplicates!
-- =========================================================
