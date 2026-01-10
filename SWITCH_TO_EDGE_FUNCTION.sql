-- FINAL SETUP: Switch to Edge Function cron (with translations)

-- Step 1: Disable the broken SQL function cron
SELECT cron.unschedule(1);

-- Step 2: Enable the Edge Function cron (if not already active)
SELECT cron.schedule(
  'send-scheduled-challenges',
  '* * * * *', -- Every minute
  $$
  SELECT
    net.http_post(
      url := 'https://uspegyneclgkscxwmomn.supabase.co/functions/v1/send-scheduled-challenges',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzcGVneW5lY2xna3NjeHdtb21uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjk3NTY1NiwiZXhwIjoyMDQ4NTUxNjU2fQ.9hqZKbmLZJdNWPNlYgDxhPBRZMONEUOzJJxdMhXNZxI'
      ),
      body := '{}'::jsonb
    ) as request_id;
  $$
);

-- Step 3: Verify only the Edge Function cron is active
SELECT jobid, jobname, schedule, active 
FROM cron.job 
WHERE jobname LIKE '%challenge%';

-- Expected: Only 'send-scheduled-challenges' should be active
