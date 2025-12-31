-- Verify the share link exists in the database
SELECT * FROM challenge_shares WHERE share_link_id = 'e81f58ae';

-- If it exists, check what the RPC returns
SELECT * FROM get_challenge_share('e81f58ae');
