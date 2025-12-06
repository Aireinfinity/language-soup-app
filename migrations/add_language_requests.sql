-- Feature 11: Language Request Integration

-- 1. Language Requests Table
CREATE TABLE IF NOT EXISTS app_language_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    language TEXT NOT NULL,
    message TEXT,
    status TEXT DEFAULT 'pending', -- pending, approved, rejected, completed
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE app_language_requests ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
CREATE POLICY "Users can view own requests"
ON app_language_requests FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create requests"
ON app_language_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all requests
CREATE POLICY "Admins can view all requests"
ON app_language_requests FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM app_users 
  WHERE id = auth.uid() AND is_admin = true
));

-- Admins can update request status
CREATE POLICY "Admins can update requests"
ON app_language_requests FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM app_users 
  WHERE id = auth.uid() AND is_admin = true
));

-- 4. Create index
CREATE INDEX IF NOT EXISTS idx_language_requests_user 
ON app_language_requests(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_language_requests_status 
ON app_language_requests(status, created_at DESC);
