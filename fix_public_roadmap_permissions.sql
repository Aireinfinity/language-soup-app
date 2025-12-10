-- Allow public access to "Public Roadmap" tickets
-- Run this in Supabase SQL Editor

-- 1. Drop existing policy that might be too restrictive (e.g. "Users can only see their own")
DROP POLICY IF EXISTS "Public can view roadmap tickets" ON app_support_messages;

-- 2. Create new policy: Users can see their OWN messages OR any message marked public_visible
CREATE POLICY "Public can view roadmap tickets"
ON app_support_messages
FOR SELECT
USING (
  (auth.uid() = user_id) -- Own messages
  OR
  (public_visible = true) -- Public roadmap items
  OR
  (exists (select 1 from app_users where id = auth.uid() and is_admin = true)) -- Admins see all
);
