-- Create the official Language Soup bot account
-- This bot will post challenges with personality while keeping the brand professional

DO $$
BEGIN
    -- Create the bot if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM app_users WHERE id = '00000000-0000-0000-0000-000000000000') THEN
        INSERT INTO app_users (
            id, 
            display_name, 
            avatar_url, 
            is_admin, 
            is_community_manager, 
            status_text,
            learning_languages,
            fluent_languages
        )
        VALUES (
            '00000000-0000-0000-0000-000000000000',
            'language soup',
            'https://uspegyneclgkscxwmomn.supabase.co/storage/v1/object/public/avatars/language-soup-bot.png',
            true,
            true,
            'here to help you connect, practice, and make friends through language 🌍💬',
            ARRAY['Spanish', 'French', 'Italian', 'German', 'Portuguese', 'Russian', 'Japanese', 'Chinese', 'Dutch', 'Hungarian', 'Swedish', 'Korean', 'English'],
            ARRAY['Spanish', 'French', 'Italian', 'German', 'Portuguese', 'Russian', 'Japanese', 'Chinese', 'Dutch', 'Hungarian', 'Swedish', 'Korean', 'English']
        );
        
        RAISE NOTICE 'Bot account created successfully! 🍜';
    ELSE
        -- Update existing bot to ensure it has the right personality
        UPDATE app_users SET
            display_name = 'language soup',
            status_text = 'here to help you connect, practice, and make friends through language 🌍💬',
            learning_languages = ARRAY['Spanish', 'French', 'Italian', 'German', 'Portuguese', 'Russian', 'Japanese', 'Chinese', 'Dutch', 'Hungarian', 'Swedish', 'Korean', 'English'],
            fluent_languages = ARRAY['Spanish', 'French', 'Italian', 'German', 'Portuguese', 'Russian', 'Japanese', 'Chinese', 'Dutch', 'Hungarian', 'Swedish', 'Korean', 'English']
        WHERE id = '00000000-0000-0000-0000-000000000000';
        
        RAISE NOTICE 'Bot account updated! 🍜';
    END IF;
END $$;
