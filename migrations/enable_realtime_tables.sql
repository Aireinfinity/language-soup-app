-- Ensure tables are in the realtime publication
-- This is critical for receiving subscription events

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'app_support_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE app_support_messages;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'app_language_requests') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE app_language_requests;
  END IF;
END
$$;
