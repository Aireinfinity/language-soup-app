-- Migration script to auto-complete quests for existing users
-- This analyzes user activity and marks appropriate quests as completed

-- Function to migrate existing users to quest system
CREATE OR REPLACE FUNCTION migrate_existing_users_to_quests()
RETURNS void AS $$
DECLARE
    user_record RECORD;
BEGIN
    -- Loop through all existing users
    FOR user_record IN SELECT id FROM app_users LOOP
        
        -- Quest: join_group
        -- Auto-complete if user is in any group
        IF EXISTS (
            SELECT 1 FROM app_group_members 
            WHERE user_id = user_record.id
        ) THEN
            INSERT INTO app_user_quests (user_id, quest_id, seen_celebration)
            VALUES (user_record.id, 'join_group', TRUE)
            ON CONFLICT (user_id, quest_id) DO NOTHING;
        END IF;
        
        -- Quest: first_text
        -- Auto-complete if user has sent any text message
        IF EXISTS (
            SELECT 1 FROM app_messages 
            WHERE sender_id = user_record.id 
            AND message_type = 'text'
        ) THEN
            INSERT INTO app_user_quests (user_id, quest_id, seen_celebration)
            VALUES (user_record.id, 'first_text', TRUE)
            ON CONFLICT (user_id, quest_id) DO NOTHING;
        END IF;
        
        -- Quest: first_audio
        -- Auto-complete if user has sent any voice message
        IF EXISTS (
            SELECT 1 FROM app_messages 
            WHERE sender_id = user_record.id 
            AND message_type = 'voice'
        ) THEN
            INSERT INTO app_user_quests (user_id, quest_id, seen_celebration)
            VALUES (user_record.id, 'first_audio', TRUE)
            ON CONFLICT (user_id, quest_id) DO NOTHING;
        END IF;
        
        -- Quest: reply_challenge
        -- Auto-complete if user has replied to any message
        IF EXISTS (
            SELECT 1 FROM app_messages 
            WHERE sender_id = user_record.id 
            AND reply_to IS NOT NULL
        ) THEN
            INSERT INTO app_user_quests (user_id, quest_id, seen_celebration)
            VALUES (user_record.id, 'reply_challenge', TRUE)
            ON CONFLICT (user_id, quest_id) DO NOTHING;
        END IF;
        
        -- Quest: community_chat
        -- Auto-complete if user has sent any community message
        IF EXISTS (
            SELECT 1 FROM app_community_messages 
            WHERE sender_id = user_record.id
        ) THEN
            INSERT INTO app_user_quests (user_id, quest_id, seen_celebration)
            VALUES (user_record.id, 'community_chat', TRUE)
            ON CONFLICT (user_id, quest_id) DO NOTHING;
        END IF;
        
        -- Quest: send_bug
        -- Auto-complete if user has sent any support message
        IF EXISTS (
            SELECT 1 FROM app_support_messages 
            WHERE user_id = user_record.id 
            AND from_admin = FALSE
        ) THEN
            INSERT INTO app_user_quests (user_id, quest_id, seen_celebration)
            VALUES (user_record.id, 'send_bug', TRUE)
            ON CONFLICT (user_id, quest_id) DO NOTHING;
        END IF;
        
        -- Quest: request_language
        -- Auto-complete if user has requested a language
        IF EXISTS (
            SELECT 1 FROM app_language_requests 
            WHERE user_id = user_record.id
        ) THEN
            INSERT INTO app_user_quests (user_id, quest_id, seen_celebration)
            VALUES (user_record.id, 'request_language', TRUE)
            ON CONFLICT (user_id, quest_id) DO NOTHING;
        END IF;
        
        -- Quest: view_profile
        -- Auto-complete for all existing users (they've likely seen their profile)
        INSERT INTO app_user_quests (user_id, quest_id, seen_celebration)
        VALUES (user_record.id, 'view_profile', TRUE)
        ON CONFLICT (user_id, quest_id) DO NOTHING;
        
        -- Quest: peek_active_groups
        -- Auto-complete for users in 2+ groups (they've explored)
        IF (
            SELECT COUNT(*) FROM app_group_members 
            WHERE user_id = user_record.id
        ) >= 2 THEN
            INSERT INTO app_user_quests (user_id, quest_id, seen_celebration)
            VALUES (user_record.id, 'peek_active_groups', TRUE)
            ON CONFLICT (user_id, quest_id) DO NOTHING;
        END IF;
        
    END LOOP;
    
    RAISE NOTICE 'Migration complete! Existing users have been migrated to quest system.';
END;
$$ LANGUAGE plpgsql;

-- Run the migration
SELECT migrate_existing_users_to_quests();

-- Drop the function after running (one-time use)
DROP FUNCTION migrate_existing_users_to_quests();
