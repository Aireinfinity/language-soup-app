-- Migration: Fix Auto Approval (Make everyone approved by default)
-- Date: 2026-01-09

-- 1. Change default to TRUE so new users are instantly visible
ALTER TABLE app_users 
ALTER COLUMN is_approved SET DEFAULT TRUE;

-- 2. Approve anyone who might be pending
UPDATE app_users 
SET is_approved = TRUE 
WHERE is_approved IS FALSE;
