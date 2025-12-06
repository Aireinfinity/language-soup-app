-- Insert a test system message to verify UI
-- This simulates a "Challenge Started" event

INSERT INTO app_messages (
    group_id, 
    sender_id, -- Can be null or a system user ID if constraint exists
    message_type, 
    content, 
    created_at
)
VALUES (
    '0bc72714-49fe-4872-8994-ac170fad0ce4', -- Use the group ID from your test data
    '00000000-0000-0000-0000-000000000001', -- Using Alice as sender for now to pass FK constraints, or NULL if allowed
    'system',
    'Challenge #5 Started: Describe your favorite childhood memory! 🧸',
    NOW()
);

-- Check it
SELECT * FROM app_messages WHERE message_type = 'system' ORDER BY created_at DESC LIMIT 1;
