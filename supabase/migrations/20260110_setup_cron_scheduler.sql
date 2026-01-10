-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the function to run every minute
-- (If it already exists, this will fail - that's okay, just means it's already set up)
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

-- View the scheduled job to confirm it's active
SELECT * FROM cron.job WHERE jobname = 'send-scheduled-challenges';
