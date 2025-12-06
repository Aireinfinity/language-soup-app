-- ============================================
-- FIX TEST DATA VISIBILITY
-- ============================================
-- It's likely your [TEST] messages are attached to an older challenge ID,
-- but the app only loads messages for the *latest* active challenge.
-- Run this script to move all [TEST] messages to the LATEST challenge.

UPDATE app_messages
SET challenge_id = (
  SELECT id FROM app_challenges 
  WHERE group_id = '0bc72714-49fe-4872-8994-ac170fad0ce4' 
  ORDER BY created_at DESC 
  LIMIT 1
)
WHERE content LIKE '%[TEST]%' 
  AND group_id = '0bc72714-49fe-4872-8994-ac170fad0ce4';

-- Check if they moved:
SELECT content, challenge_id FROM app_messages 
WHERE content LIKE '%[TEST]%'
ORDER BY created_at DESC;
