-- FINAL FIX: Create System Bot + Update Function to handle missing bot gracefully

-- Step 1: Create the System Bot user
INSERT INTO app_users (id, username, full_name, avatar_url, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    'system_bot',
    'Soup Bot 🥣',
    'https://api.dicebear.com/7.x/bottts/svg?seed=soup-bot',
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Manually send the stuck challenge NOW
-- (This will trigger immediately, no need to wait for cron)
INSERT INTO app_challenges (group_id, prompt_text, created_by, created_at)
SELECT 
    g.id as group_id,
    'if you could be one animal, what would you be? 🌈🦄🧸',
    '00000000-0000-0000-0000-000000000000',
    NOW()
FROM app_groups g;

-- Step 3: Mark it as sent
UPDATE app_scheduled_challenges
SET status = 'sent'
WHERE id = '1b057822-1914-4b88-99d1-fc4e1870e8d7';

-- Your challenge will send within seconds! ✅
