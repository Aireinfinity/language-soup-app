-- FIX BOT ACCOUNT
-- 1. Reset avatar to official icon
-- 2. Clear flags (set to empty array or null)

UPDATE app_users
SET 
  avatar_url = 'https://uspegyneclgkscxwmomn.supabase.co/storage/v1/object/public/avatars/ls-icon-bowl.png', -- Assuming this key exists or similar
  learning_languages = '{}',
  fluent_languages = '{}',
  display_name = 'Language Soup',
  status_text = 'Official Account'
WHERE id = '00000000-0000-0000-0000-000000000000';

-- Verify the change
SELECT * FROM app_users WHERE id = '00000000-0000-0000-0000-000000000000';
