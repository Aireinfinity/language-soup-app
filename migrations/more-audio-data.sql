-- ============================================
-- ADD MORE AUDIO FOR PODCAST TEST
-- ============================================
-- We need multiple audio messages to trigger Podcast Mode!
-- This script adds 4 audio messages to the current active challenge.

-- 1. Get the current active challenge ID
DO $$
DECLARE
  target_challenge_id UUID;
  target_group_id UUID := '0bc72714-49fe-4872-8994-ac170fad0ce4'; -- French Intermediate
BEGIN
  -- Find the latest challenge
  SELECT id INTO target_challenge_id 
  FROM app_challenges 
  WHERE group_id = target_group_id
  ORDER BY created_at DESC 
  LIMIT 1;

  -- 2. Insert 4 Audio Messages (Total > 60 seconds)
  
  -- Audio 1 (Alice)
  INSERT INTO app_messages (sender_id, group_id, challenge_id, message_type, media_url, duration_seconds, created_at)
  VALUES (
    '00000000-0000-0000-0000-000000000001', 
    target_group_id, 
    target_challenge_id, 
    'voice', 
    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', 
    20, 
    NOW() - INTERVAL '3 minutes'
  );

  -- Audio 2 (Bob)
  INSERT INTO app_messages (sender_id, group_id, challenge_id, message_type, media_url, duration_seconds, created_at)
  VALUES (
    '00000000-0000-0000-0000-000000000002', 
    target_group_id, 
    target_challenge_id, 
    'voice', 
    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', 
    25, 
    NOW() - INTERVAL '2 minutes 30 seconds'
  );

  -- Audio 3 (Alice again)
  INSERT INTO app_messages (sender_id, group_id, challenge_id, message_type, media_url, duration_seconds, created_at)
  VALUES (
    '00000000-0000-0000-0000-000000000001', 
    target_group_id, 
    target_challenge_id, 
    'voice', 
    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', 
    15, 
    NOW() - INTERVAL '2 minutes'
  );

  -- Audio 4 (Bob again)
  INSERT INTO app_messages (sender_id, group_id, challenge_id, message_type, media_url, duration_seconds, created_at)
  VALUES (
    '00000000-0000-0000-0000-000000000002', 
    target_group_id, 
    target_challenge_id, 
    'voice', 
    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', 
    30, 
    NOW() - INTERVAL '1 minute'
  );

END $$;
