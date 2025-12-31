-- Delete all share links created by Hamza (test user)
DELETE FROM challenge_shares 
WHERE sharer_user_id = 'b4f1aced-88b7-40e9-a57d-1960b583320d';

-- Verify deletion
SELECT COUNT(*) as remaining_hamza_shares
FROM challenge_shares 
WHERE sharer_user_id = 'b4f1aced-88b7-40e9-a57d-1960b583320d';
