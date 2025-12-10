-- Create a system bot user for automated messages
INSERT INTO app_users (id, display_name, avatar_url, fluent_languages)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Soup Bot 🥣',
    'https://ui-avatars.com/api/?name=Soup+Bot&background=0D8ABC&color=fff',
    ARRAY['English', 'Soup']
)
ON CONFLICT (id) DO NOTHING;
