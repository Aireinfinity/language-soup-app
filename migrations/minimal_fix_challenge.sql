-- STEP 2: Fix the challenge trigger to use the bot account
-- Run this AFTER creating the bot account

-- Drop the duplicate/broken notification trigger
DROP TRIGGER IF EXISTS on_challenge_created_send_notification ON app_challenges;
DROP FUNCTION IF EXISTS trigger_challenge_push_notification();

-- Update the working trigger to use bot account
CREATE OR REPLACE FUNCTION handle_new_challenge()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert challenge message from the Language Soup bot
    INSERT INTO app_messages (
        group_id,
        sender_id,
        message_type,
        content,
        challenge_id
    )
    VALUES (
        NEW.group_id,
        '00000000-0000-0000-0000-000000000000', -- Language Soup bot (not created_by)
        'text',
        '#challenge' || E'\n' || NEW.prompt_text,
        NEW.id
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- The trigger stays the same, just the function is updated
-- Notifications are handled by JavaScript in send-challenge.jsx
