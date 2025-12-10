-- Fix missing timezone column
ALTER TABLE public.app_users 
ADD COLUMN IF NOT EXISTS timezone TEXT;

-- Refresh the schema cache (optional but good practice)
NOTIFY pgrst, 'reload config';
