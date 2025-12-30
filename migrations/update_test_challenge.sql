-- Update the test share to include the challenge text
-- Run this in Supabase SQL Editor

-- Option 1: Update Hamza's message to include the challenge text
UPDATE app_messages
SET content = 'when do you feel the most like yourself? / quand est-ce que tu te sens la plus comme toi?'
WHERE id = (
    SELECT challenge_message_id 
    FROM challenge_shares 
    WHERE share_link_id = 'hamza123'
);

-- Option 2: Or just verify the data is there
SELECT * FROM get_challenge_share('hamza123');
