-- TEST THE AUTO-SEND WITHOUT NOTIFYING USERS
-- This simulates what the cron will do, but we can check the results before notifications go out

-- Step 1: Temporarily disable notifications by checking what WOULD be sent
-- (We'll manually call the Edge Function and check the database)

-- First, let's see what's currently approved and ready to send
SELECT id, challenge_text, status, scheduled_time
FROM app_scheduled_challenges
WHERE status = 'approved'
  AND scheduled_time <= NOW() + INTERVAL '2 minutes';

-- Step 2: To test without sending notifications:
-- Option A: Create a test challenge scheduled for 1 minute from now
INSERT INTO app_scheduled_challenges (challenge_text, scheduled_time, status, created_by)
VALUES (
    'TEST: what is your favorite test? 🧪',
    NOW() + INTERVAL '1 minute',
    'approved',
    '00000000-0000-0000-0000-000000000000'
)
RETURNING id, challenge_text, scheduled_time;

-- Step 3: After 1 minute, check if it was processed:
-- SELECT * FROM app_challenges WHERE prompt_text LIKE '%TEST:%' ORDER BY created_at DESC LIMIT 5;

-- Step 4: Check the format to verify translations worked:
-- You should see: #challenge\n[english]\n[translation] for non-English groups

-- Step 5: Delete the test challenge from all groups to avoid confusion:
-- DELETE FROM app_challenges WHERE prompt_text LIKE '%TEST:%';
