-- Check the current RPC function
SELECT routine_definition 
FROM information_schema.routines 
WHERE routine_name = 'get_challenge_share';

-- We need to update it to fetch the challenge text from the most recent
-- challenge message sent before the voice response in that group
