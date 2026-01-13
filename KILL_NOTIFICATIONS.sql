-- EMERGENCY: DROP THE TRIGGER CAUSING THE SPAM
-- The table 'app_challenges' has a trigger that fires on every insert.
-- When we insert 70 rows (one for each group), it fires 70 times.
-- If the function sends to 'all users', everyone gets 70 pings.

DROP TRIGGER IF EXISTS trigger_notify_new_challenge ON app_challenges;
DROP FUNCTION IF EXISTS notify_users_of_new_challenge();

-- Also drop the other one just in case
DROP TRIGGER IF EXISTS trigger_notify_challenge_sent ON app_scheduled_challenges;
-- We will re-add the CORRECT one later. Right now, silence is golden.
