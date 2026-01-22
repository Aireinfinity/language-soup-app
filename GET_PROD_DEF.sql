-- Check the current PROD function definition in the database
SELECT routine_definition 
FROM information_schema.routines 
WHERE routine_name = 'process_scheduled_challenges_prod';
