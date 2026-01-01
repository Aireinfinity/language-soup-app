-- Create a "Ghost User" (Existing user with NO password)
-- Run this, then try to log in as "Test Ghost" in the app.

INSERT INTO app_users (id, display_name, emoji_password, status_text)
VALUES (
  '00000000-0000-0000-0000-000000009999', -- Random Dummy ID
  'Test Ghost',
  NULL, -- NULL password = "Existing user who hasn't claimed account"
  'I am a test ghost 👻'
)
ON CONFLICT (id) DO NOTHING;
