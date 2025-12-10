-- Enable Realtime for app_native_speakers
-- You must run this in the Supabase SQL Editor for auto-refresh to work!

begin;
  -- Enable replication on the table (required for Realtime)
  alter publication supabase_realtime add table app_native_speakers;
commit;

-- Make yourself an admin (replace YOUR_USER_ID with your actual UUID from auth.users)
-- You can find your ID in the Authentication tab or app_users table
-- UPDATE app_users SET is_admin = true WHERE id = 'YOUR_USER_ID';

-- OR, acts as a catch-all for development (make everyone admin - use carefully!)
-- UPDATE app_users SET is_admin = true;
