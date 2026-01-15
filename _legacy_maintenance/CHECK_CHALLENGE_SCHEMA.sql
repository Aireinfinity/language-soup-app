-- CHECK_CHALLENGE_SCHEMA.sql
-- Check all columns in app_scheduled_challenges to see translation fields.

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'app_scheduled_challenges';
