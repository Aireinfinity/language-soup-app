-- Check total count
select count(*) from app_push_tokens;

-- Check tokens for a specific user (noah :) if we can find him via join, or just dump a few)
select u.display_name, t.* 
from app_push_tokens t
join app_users u on u.id = t.user_id
limit 5;
