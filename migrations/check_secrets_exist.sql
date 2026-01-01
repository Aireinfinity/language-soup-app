-- CHECK IF SECRETS ARE SET
-- If this returns 0 rows, then the secrets are NOT set and the trigger is failing.
SELECT name, setting 
FROM pg_settings 
WHERE name = 'app.settings.supabase_url' 
   OR name = 'app.settings.supabase_service_role_key';
