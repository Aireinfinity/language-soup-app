-- APPROVE_NEXT.sql
-- Flips the Jan 18 challenge from 'pending' to 'approved'.

UPDATE app_scheduled_challenges
SET status = 'approved'
WHERE id = 'ef020f6f-008a-42e9-9218-0fa0aece19b7';

-- Show the result
SELECT id, status, scheduled_time, challenge_text
FROM app_scheduled_challenges
WHERE id = 'ef020f6f-008a-42e9-9218-0fa0aece19b7';
