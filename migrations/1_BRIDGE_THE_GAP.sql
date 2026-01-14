-- STEP 1: BRIDGE THE GAP
-- This script ONLY adds the "Listener".
-- It watches for new challenges and inserts the chat message.
-- It CANNOT send notifications (0% Risk of loops).

-- A. Safety: Remove old triggers first
DROP TRIGGER IF EXISTS on_challenge_created_send_notification ON app_challenges;
DROP TRIGGER IF EXISTS on_challenge_created ON app_challenges;

-- B. The "Paste Text" Function
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

-- C. The Trigger
CREATE TRIGGER on_challenge_created
AFTER INSERT ON app_challenges
FOR EACH ROW
EXECUTE FUNCTION handle_new_challenge();
