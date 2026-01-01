-- Update bot avatar with full Supabase storage URL
-- Replace YOUR_PROJECT_ID with your actual Supabase project ID

UPDATE app_users
SET 
    avatar_url = 'https://uspegyneclgkscxwmomn.supabase.co/storage/v1/object/public/avatars/bot-avatar.png',
    updated_at = NOW()
WHERE id = '00000000-0000-0000-0000-000000000000';
