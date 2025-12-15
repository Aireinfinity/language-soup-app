-- ============================================
-- FIX AUDIO TEST DATA VISIBILITY
-- ============================================
-- The previous fix only grabbed messages with text "[TEST]"
-- Audio messages have NULL content, so they were left behind!
-- This script moves the audio test messages to the current challenge.

UPDATE app_messages
SET challenge_id = (
  SELECT id FROM app_challenges 
  WHERE group_id = '0bc72714-49fe-4872-8994-ac170fad0ce4' 
  ORDER BY created_at DESC 
  LIMIT 1
)
WHERE 
  group_id = '0bc72714-49fe-4872-8994-ac170fad0ce4'
  AND (
    -- Target messages created by our test users
    sender_id IN (
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002'
    )
    -- OR target messages with audio created recently (in case it's your audio)
    OR (message_type = 'voice' AND created_at > NOW() - INTERVAL '1 hour')
  );

-- Verify audio is there now
SELECT id, message_type, challenge_id FROM app_messages
WHERE group_id = '0bc72714-49fe-4872-8994-ac170fad0ce4'
AND message_type = 'voice';
