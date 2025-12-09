-- Fix Foreign Key for Community Messages to point to public.app_users to allow joins
-- Drop existing FK to auth.users if it exists (might be named differently, so we try generic removal or just add new one)

-- First, try to drop the likely existing constraint name if it was auto-generated
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'app_community_messages_user_id_fkey') THEN 
    ALTER TABLE app_community_messages DROP CONSTRAINT app_community_messages_user_id_fkey; 
  END IF; 
END $$;

-- Add FK strictly to public.app_users
-- This allows PostgREST to join app_community_messages with app_users
ALTER TABLE app_community_messages
ADD CONSTRAINT app_community_messages_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.app_users(id)
ON DELETE CASCADE;

-- Ensure RLS is still good (it was)
