-- Check both share links to see which has correct data

-- First link
SELECT 'c3ac039f' as link_id, * FROM get_challenge_share('c3ac039f');

-- Second link  
SELECT 'b23327f6' as link_id, * FROM get_challenge_share('b23327f6');
