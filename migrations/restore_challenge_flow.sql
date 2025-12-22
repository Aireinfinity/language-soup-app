-- =========================================================
-- CHALLENGE FLOW: Creates challenge messages in chat
-- =========================================================
-- This trigger ensures challenges appear in chat with format:
-- #challenge
-- English text
-- Native language text
--
-- The banner also shows the latest challenge
-- New challenges replace the banner, old ones stay in chat history

-- Add created_by column (tracks who sent the challenge)
ALTER TABLE app_challenges ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES app_users(id);

-- Create the trigger function
CREATE OR REPLACE FUNCTION handle_new_challenge()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert challenge message in chat
    -- Format: #challenge\nEnglish\nNative
    INSERT INTO app_messages (
        group_id,
        sender_id,
        message_type,
        content,
        challenge_id
    )
    VALUES (
        NEW.group_id,
        NEW.created_by, -- Message appears from the person who sent the challenge
        'text', -- Regular text message
        '#challenge' || E'\n' || NEW.prompt_text, -- Adds #challenge prefix
        NEW.id
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create/replace the trigger
DROP TRIGGER IF EXISTS on_challenge_created ON app_challenges;
CREATE TRIGGER on_challenge_created
AFTER INSERT ON app_challenges
FOR EACH ROW
EXECUTE FUNCTION handle_new_challenge();

-- =========================================================
-- DONE! Challenge flow restored ✅
-- =========================================================
