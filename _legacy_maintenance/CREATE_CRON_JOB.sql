-- CREATE THE MISSING CRON JOB
-- This will enable automatic challenge sending with translations

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

-- Verify it was created
SELECT jobid, jobname, schedule, active FROM cron.job WHERE jobname = 'send-scheduled-challenges';
