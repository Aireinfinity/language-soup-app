-- Ensure the official Language Soup bot exists
-- This bot is used for system actions like sending challenges

INSERT INTO app_users (
    id,
    display_name,
    avatar_url,
    is_admin,
    is_community_manager,
    status_text,
    learning_languages,
    fluent_languages,
    created_at,
    updated_at
)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    'language soup',
    '/bot-icon.png',
    true,
    true,
    'Official Soup Bot',
    ARRAY['Spanish', 'French', 'Italian', 'German', 'Portuguese', 'Russian', 'Japanese', 'Chinese', 'Dutch', 'Hungarian', 'Swedish', 'Korean', 'English'],
    ARRAY['Spanish', 'French', 'Italian', 'German', 'Portuguese', 'Russian', 'Japanese', 'Chinese', 'Dutch', 'Hungarian', 'Swedish', 'Korean', 'English'],
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    avatar_url = EXCLUDED.avatar_url,
    is_admin = EXCLUDED.is_admin,
    is_community_manager = EXCLUDED.is_community_manager,
    learning_languages = EXCLUDED.learning_languages,
    fluent_languages = EXCLUDED.fluent_languages,
    updated_at = NOW();
