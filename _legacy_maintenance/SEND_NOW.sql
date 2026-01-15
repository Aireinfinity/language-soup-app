-- SEND THE STUCK CHALLENGE NOW
-- Uses your existing "language soup" bot (already exists!)

-- Insert the challenge into app_challenges for all groups
-- This will trigger the webhook → send notifications automatically
INSERT INTO app_challenges (group_id, prompt_text, created_by, created_at)
SELECT 
    g.id as group_id,
    'if you could be one animal, what would you be? 🌈🦄🧸',
    '00000000-0000-0000-0000-000000000000', -- Your "language soup" bot
    NOW()
FROM app_groups g;

-- Mark it as sent in the schedule
UPDATE app_scheduled_challenges
SET status = 'sent'
WHERE id = '1b057822-1914-4b88-99d1-fc4e1870e8d7';

-- Done! The webhook will trigger and send notifications within seconds.
-- It will show as from "language soup" with your bot icon. ✅
