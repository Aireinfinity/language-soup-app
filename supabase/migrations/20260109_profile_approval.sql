-- Migration: Add Profile Approval System
-- Date: 2026-01-09

-- 1. Add approval columns
ALTER TABLE app_users 
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE;

-- 2. Approve all existing users (so current users don't become anonymous suddenly)
UPDATE app_users 
SET is_approved = TRUE 
WHERE is_approved IS FALSE;

-- 3. (Optional) Indexes if we query by is_approved often
CREATE INDEX IF NOT EXISTS idx_users_is_approved ON app_users(is_approved);
