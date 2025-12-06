-- =========================================================
-- TEST: Verify Automatic Challenge Pinning
-- =========================================================

-- 1. Create a new challenge manually
-- Make sure to replace 'YOUR_GROUP_ID' with the actual group ID you are looking at in the app!
-- You can find it in the URL of the chat screen or from previous test data scripts.
-- Defaulting to the group ID used in previous test data: '0bc72714-49fe-4872-8994-ac170fad0ce4'

INSERT INTO app_challenges (
    group_id, 
    prompt_text, 
    created_at,
    expires_at
)
VALUES (
    '0bc72714-49fe-4872-8994-ac170fad0ce4', 
    'Trigger Test: What is the best meal you ever cooked? 🍳', 
    NOW(),
    NOW() + INTERVAL '24 hours'
);

-- 2. Verify the System Message was created
SELECT * FROM app_messages 
WHERE message_type = 'system' 
ORDER BY created_at DESC 
LIMIT 1;

-- If the trigger worked, you should see a new message here!
-- And if you check the App, it should appear at the bottom of the chat.
