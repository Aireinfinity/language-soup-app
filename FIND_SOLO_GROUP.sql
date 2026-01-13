-- FIND THE SOLO GROUP
-- We need the exact name or ID to filter the Cron Job.

SELECT id, name, language 
FROM app_groups 
WHERE name ILIKE '%noah%' OR name ILIKE '%test%';
