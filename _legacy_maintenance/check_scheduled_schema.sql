-- Check what's actually stored in scheduled challenges
SELECT id, challenge_text, status, scheduled_time, created_at
FROM app_scheduled_challenges
ORDER BY created_at DESC
LIMIT 3;

-- Check the schema to see what columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'app_scheduled_challenges'
ORDER BY ordinal_position;
