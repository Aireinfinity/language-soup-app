-- DOUBLE CHECK VIA FUNCTION CALL
DO $$
BEGIN
    BEGIN
        RAISE NOTICE 'Supabase URL: %', current_setting('app.settings.supabase_url');
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ app.settings.supabase_url IS NOT SET';
    END;

    BEGIN
        RAISE NOTICE 'Service Key: %', current_setting('app.settings.supabase_service_role_key');
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ app.settings.supabase_service_role_key IS NOT SET';
    END;
END $$;
