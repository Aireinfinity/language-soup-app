-- FINAL SETUP: Switch cron to call the new edge function

-- Unschedule old cron job
SELECT cron.unschedule('send-scheduled-challenges');

-- Schedule new cron job to call edge function
SELECT cron.schedule(
  'auto-send-challenges',
  '* * * * *', -- Every minute
  $$
  SELECT
    net.http_post(
      url := 'https://uspegyneclgkscxwmomn.supabase.co/functions/v1/auto-send-challenges',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzcGVneW5lY2xna3NjeHdtb21uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjk3NTY1NiwiZXhwIjoyMDQ4NTUxNjU2fQ.9hqZKbmLZJdNWPNlYgDxhPBRZMONEUOzJJxdMhXNZxI'
      ),
      body := '{}'::jsonb
    ) as request_id;
  $$
);

-- Verify
SELECT jobid, jobname, schedule, active 
FROM cron.job 
WHERE jobname = 'auto-send-challenges';
