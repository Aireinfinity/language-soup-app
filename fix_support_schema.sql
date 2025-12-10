-- Add missing columns to app_support_messages for ticket management
-- Run in Supabase SQL Editor

ALTER TABLE app_support_messages
ADD COLUMN IF NOT EXISTS is_ticket BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS public_visible BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'bug',
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'P2',
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new';

-- Ensure app_language_requests table exists (if not created yet)
CREATE TABLE IF NOT EXISTS app_language_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES app_users(id),
  language TEXT NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for requests
ALTER TABLE app_language_requests ENABLE ROW LEVEL SECURITY;

-- Allow users to create requests
CREATE POLICY "Users can create requests" ON app_language_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow admins to view all requests
CREATE POLICY "Admins view all requests" ON app_language_requests
  FOR SELECT USING (
    exists (select 1 from app_users where id = auth.uid() and is_admin = true)
  );
