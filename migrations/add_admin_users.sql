-- Admin Panel: Add is_admin column to app_users table

ALTER TABLE app_users 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Create index for faster admin checks
CREATE INDEX IF NOT EXISTS idx_users_is_admin 
ON app_users(is_admin) 
WHERE is_admin = true;

-- Grant your admin user admin access (replace with your user ID)
-- UPDATE app_users SET is_admin = true WHERE email = 'your-email@example.com';

-- RLS Policies for Admin Operations

-- Only admins can create challenges
CREATE POLICY "Admins can create challenges"
ON app_challenges FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM app_users 
  WHERE id = auth.uid() AND is_admin = true
));

-- Only admins can delete challenges
CREATE POLICY "Admins can delete challenges"
ON app_challenges FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM app_users 
  WHERE id = auth.uid() AND is_admin = true
));

-- Only admins can update challenges
CREATE POLICY "Admins can update challenges"
ON app_challenges FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM app_users 
  WHERE id = auth.uid() AND is_admin = true
));
