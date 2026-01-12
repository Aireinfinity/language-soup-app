-- EMERGENCY: Disable the broken SQL function immediately
-- This prevents it from sending more untranslated challenges

-- Option 1: Disable the cron job temporarily
SELECT cron.unschedule(1);

-- Option 2: Change the function to do nothing (safer - keeps the cron but stops sending)
CREATE OR REPLACE FUNCTION auto_send_approved_challenges()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Temporarily disabled - translations need to be added
    RAISE NOTICE 'Function disabled - use Edge Function for translations';
    RETURN;
END;
$$;

-- Verify cron is stopped
SELECT jobid, jobname, active FROM cron.job WHERE jobid = 1;
