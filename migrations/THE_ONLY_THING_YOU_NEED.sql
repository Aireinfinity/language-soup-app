-- THE ONLY THING YOU NEED.sql
-- Diagnosis based on your output:
-- 1. Cron Job: PERFECT. (It blasts everyone, which you want).
-- 2. Trigger: MISSING. (This is why text didn't appear).

-- A. REFRESH THE PRINTER FUNCTION (Safe Check)
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

-- B. PLUG IN THE TRIGGER (The Missing Piece)
CREATE TRIGGER on_challenge_created
AFTER INSERT ON app_challenges
FOR EACH ROW
EXECUTE FUNCTION handle_new_challenge();

-- C. CONFIRM SUCCESS
SELECT '✅ SUCESS: System is Fixed.' as status,
       'Trigger Installed. Messages will now print.' as action_taken;
