-- SET SECRETS FOR PG_NET TRIGGER
-- Check current settings first
SELECT name, setting FROM pg_settings WHERE name LIKE 'app.settings.%';

-- instructions to set them (User needs to provide keys)
-- ALTER DATABASE postgres SET app.settings.supabase_url = 'https://uspegyneclgkscxwmomn.supabase.co';
-- ALTER DATABASE postgres SET app.settings.supabase_service_role_key = 'SERVICE_ROLE_KEY_HERE';
