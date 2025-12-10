-- Allow Admins to Delete Native Speakers
-- Run this in Supabase SQL Editor

-- 1. Ensure RLS is enabled
ALTER TABLE app_native_speakers ENABLE ROW LEVEL SECURITY;

-- 2. Create a policy for deletion
-- Drop if exists to avoid errors on re-run
DROP POLICY IF EXISTS "Admins can delete native speakers" ON app_native_speakers;

CREATE POLICY "Admins can delete native speakers"
ON app_native_speakers
FOR DELETE
USING (
  exists (
    select 1 from app_users
    where app_users.id = auth.uid()
    and app_users.is_admin = true
  )
);

-- 3. Also allow users to delete THEMSELVES (optional but good UX)
DROP POLICY IF EXISTS "Users can delete themselves" ON app_native_speakers;

CREATE POLICY "Users can delete themselves"
ON app_native_speakers
FOR DELETE
USING (
  auth.uid() = user_id
);
