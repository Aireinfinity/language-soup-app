-- =========================================================
-- TRIGGER: Auto-Create System Message on New Challenge
-- =========================================================

-- 1. Create the Function
CREATE OR REPLACE FUNCTION handle_new_challenge()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert a system message into the chat history
    INSERT INTO app_messages (
        group_id,
        sender_id, -- We need a dummy sender ID or a system ID. 
                   -- Using a hardcoded NULL or a specific 'System' UUID if you have one.
                   -- For now, let's assume NULL is allowed or we subquery a bot user.
                   -- If NULL not allowed, replace with valid UUID.
        message_type,
        content
    )
    VALUES (
        NEW.group_id,
        (SELECT id FROM app_users LIMIT 1), -- Fallback: Just grab first user as 'sender' to satisfy FK, or use a dedicated bot.
        'system',
        '🎯 Challenge Started: ' || NEW.prompt_text
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Create the Trigger
DROP TRIGGER IF EXISTS on_challenge_created ON app_challenges;

CREATE TRIGGER on_challenge_created
AFTER INSERT ON app_challenges
FOR EACH ROW
EXECUTE FUNCTION handle_new_challenge();

-- =========================================================
-- VERIFICATION
-- =========================================================
-- To test:
-- INSERT INTO app_challenges (group_id, prompt_text, created_by) VALUES ('YOUR_GROUP_ID', 'Test Trigger Challenge', 'YOUR_USER_ID');
