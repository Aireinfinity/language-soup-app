-- Update the Language Soup bot account
-- Set the custom icon and remove language flags

UPDATE app_users
SET 
    avatar_url = '/bot-avatar.png',
    learning_languages = NULL,
    fluent_languages = NULL,
    updated_at = NOW()
WHERE id = '00000000-0000-0000-0000-000000000000';
