-- =========================================================
-- FIX: Challenge sender + notifications
-- =========================================================
-- Issues fixed:
-- 1. Challenges now send from Language Soup bot (not noah :))
-- 2. Removes duplicate triggers causing double messages
-- 3. Ensures notifications work properly
-- =========================================================

-- Step 1: Drop ALL existing challenge triggers to prevent duplicates
DROP TRIGGER IF EXISTS on_challenge_created ON app_challenges;
DROP TRIGGER IF EXISTS on_challenge_created_send_notification ON app_challenges;
DROP FUNCTION IF EXISTS handle_new_challenge();
DROP FUNCTION IF EXISTS trigger_challenge_push_notification();

-- Step 2: Create the SINGLE trigger function
-- This sends challenges from the Language Soup bot account
CREATE OR REPLACE FUNCTION handle_new_challenge()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert challenge message in chat FROM THE LANGUAGE SOUP BOT
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
        '00000000-0000-0000-0000-000000000000', -- Language Soup bot UUID (not created_by)
        'text',
        '#challenge' || E'\n' || NEW.prompt_text,
        NEW.id
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create the SINGLE trigger
CREATE TRIGGER on_challenge_created
AFTER INSERT ON app_challenges
FOR EACH ROW
EXECUTE FUNCTION handle_new_challenge();

-- =========================================================
-- DONE! ✅
-- - Challenges now send from "language soup" account
-- - No more duplicate messages
-- - Notifications handled in JavaScript (send-challenge.jsx)
-- =========================================================
