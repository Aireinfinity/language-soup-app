-- ============================================
-- FAKE TEST DATA FOR MESSAGE GROUPING
-- ============================================
-- All messages are marked with [TEST] prefix for easy identification
-- Ready to run! Just copy and paste into Supabase SQL Editor

-- Create test users (simplified - just display_name)
INSERT INTO app_users (id, display_name)
VALUES 
  ('00000000-0000-0000-0000-000000000001', '[TEST] Alice'),
  ('00000000-0000-0000-0000-000000000002', '[TEST] Bob')
ON CONFLICT (id) DO NOTHING;

-- Test User 1 Messages (You) - GROUP THEM!
INSERT INTO app_messages (sender_id, group_id, challenge_id, content, message_type, created_at)
VALUES 
  ('b95021fe-ce61-4cc0-974a-8a6f6973f6f3', '0bc72714-49fe-4872-8994-ac170fad0ce4', 'e7c0455d-b1ab-49f0-916f-1e1a1d3826ec', '[TEST] Hey everyone!', 'text', NOW() - INTERVAL '10 minutes'),
  ('b95021fe-ce61-4cc0-974a-8a6f6973f6f3', '0bc72714-49fe-4872-8994-ac170fad0ce4', 'e7c0455d-b1ab-49f0-916f-1e1a1d3826ec', '[TEST] How are you all doing?', 'text', NOW() - INTERVAL '9 minutes 30 seconds'),
  ('b95021fe-ce61-4cc0-974a-8a6f6973f6f3', '0bc72714-49fe-4872-8994-ac170fad0ce4', 'e7c0455d-b1ab-49f0-916f-1e1a1d3826ec', '[TEST] Ready to practice French?', 'text', NOW() - INTERVAL '9 minutes');

-- Alice's messages (should group together)
INSERT INTO app_messages (sender_id, group_id, challenge_id, content, message_type, created_at)
VALUES 
  ('00000000-0000-0000-0000-000000000001', '0bc72714-49fe-4872-8994-ac170fad0ce4', 'e7c0455d-b1ab-49f0-916f-1e1a1d3826ec', '[TEST] Bonjour! 👋', 'text', NOW() - INTERVAL '8 minutes'),
  ('00000000-0000-0000-0000-000000000001', '0bc72714-49fe-4872-8994-ac170fad0ce4', 'e7c0455d-b1ab-49f0-916f-1e1a1d3826ec', '[TEST] Comment ça va?', 'text', NOW() - INTERVAL '7 minutes 45 seconds'),
  ('00000000-0000-0000-0000-000000000001', '0bc72714-49fe-4872-8994-ac170fad0ce4', 'e7c0455d-b1ab-49f0-916f-1e1a1d3826ec', '[TEST] Je suis prête!', 'text', NOW() - INTERVAL '7 minutes 30 seconds');

-- Bob's messages (should group together)
INSERT INTO app_messages (sender_id, group_id, challenge_id, content, message_type, created_at)
VALUES 
  ('00000000-0000-0000-0000-000000000002', '0bc72714-49fe-4872-8994-ac170fad0ce4', 'e7c0455d-b1ab-49f0-916f-1e1a1d3826ec', '[TEST] Salut tout le monde!', 'text', NOW() - INTERVAL '6 minutes'),
  ('00000000-0000-0000-0000-000000000002', '0bc72714-49fe-4872-8994-ac170fad0ce4', 'e7c0455d-b1ab-49f0-916f-1e1a1d3826ec', '[TEST] Ça va bien, merci!', 'text', NOW() - INTERVAL '5 minutes 50 seconds');

-- Your response (breaks group, new group)
INSERT INTO app_messages (sender_id, group_id, challenge_id, content, message_type, created_at)
VALUES 
  ('b95021fe-ce61-4cc0-974a-8a6f6973f6f3', '0bc72714-49fe-4872-8994-ac170fad0ce4', 'e7c0455d-b1ab-49f0-916f-1e1a1d3826ec', '[TEST] Génial! Let''s practice!', 'text', NOW() - INTERVAL '5 minutes');

-- Mixed text and audio messages
INSERT INTO app_messages (sender_id, group_id, challenge_id, content, message_type, media_url, duration_seconds, created_at)
VALUES 
  ('00000000-0000-0000-0000-000000000001', '0bc72714-49fe-4872-8994-ac170fad0ce4', 'e7c0455d-b1ab-49f0-916f-1e1a1d3826ec', NULL, 'voice', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', 15, NOW() - INTERVAL '4 minutes'),
  ('00000000-0000-0000-0000-000000000001', '0bc72714-49fe-4872-8994-ac170fad0ce4', 'e7c0455d-b1ab-49f0-916f-1e1a1d3826ec', '[TEST] That was me practicing!', 'text', NULL, NULL, NOW() - INTERVAL '3 minutes 50 seconds');

-- ============================================
-- CLEANUP SCRIPT - Run this when done testing
-- ============================================
/*
DELETE FROM app_messages WHERE content LIKE '[TEST]%' OR sender_id IN (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002'
);

DELETE FROM app_users WHERE id IN (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002'
);
*/
