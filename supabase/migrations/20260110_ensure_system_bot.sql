-- Ensure the System Bot user exists
-- This user is required for the automated challenge sender
INSERT INTO public.app_users (id, username, full_name, avatar_url, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    'system_bot',
    'Soup Bot 🥣',
    'https://api.dicebear.com/7.x/bottts/svg?seed=soup-bot',
    NOW()
)
ON CONFLICT (id) DO UPDATE
SET 
    username = EXCLUDED.username,
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url;

-- Ensure the bot is an admin (optional, depending on your RLS)
-- INSERT INTO public.app_admins (user_id) ... if needed
