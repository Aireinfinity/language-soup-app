-- 🔍 Let's see what tables are actually in the 'net' schema
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'net';
