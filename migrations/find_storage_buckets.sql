-- Check what storage buckets exist
SELECT name, public 
FROM storage.buckets 
ORDER BY created_at;
