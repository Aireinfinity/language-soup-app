-- Find the exact challenges table name
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (table_name LIKE '%challenge%' OR table_name LIKE '%daily%')
ORDER BY table_name;
