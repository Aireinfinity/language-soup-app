-- FINAL MAGIC UNLOCK SCRIPT
-- Paste this into Supabase SQL Editor and hit Run.
-- This cleans up old "garbage" data and unlocks manual deletions.

DO $$
BEGIN
    -- STEP 1: PURGE ORPHAN DATA
    -- This deletes any messages, memberships, or notifications that reference users who don't exist anymore.
    DELETE FROM app_messages WHERE sender_id NOT IN (SELECT id FROM app_users);
    DELETE FROM app_group_members WHERE user_id NOT IN (SELECT id FROM app_users);
    DELETE FROM app_notifications WHERE user_id NOT IN (SELECT id FROM app_users);
    DELETE FROM app_scheduled_challenges WHERE created_by NOT IN (SELECT id FROM app_users);
    DELETE FROM app_reactions WHERE user_id NOT IN (SELECT id FROM app_users);

    -- STEP 2: ENABLE CASCADE DELETES
    -- This makes it so future deletions automatically clean up all related data.

    -- Messages
    ALTER TABLE IF EXISTS app_messages 
    DROP CONSTRAINT IF EXISTS app_messages_sender_id_fkey,
    ADD CONSTRAINT app_messages_sender_id_fkey 
    FOREIGN KEY (sender_id) REFERENCES app_users(id) ON DELETE CASCADE;

    -- Group Memberships
    ALTER TABLE IF EXISTS app_group_members 
    DROP CONSTRAINT IF EXISTS app_group_members_user_id_fkey,
    ADD CONSTRAINT app_group_members_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE;

    -- Notifications
    ALTER TABLE IF EXISTS app_notifications 
    DROP CONSTRAINT IF EXISTS app_notifications_user_id_fkey,
    ADD CONSTRAINT app_notifications_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE;

    -- Scheduled Challenges
    ALTER TABLE IF EXISTS app_scheduled_challenges 
    DROP CONSTRAINT IF EXISTS app_scheduled_challenges_created_by_fkey,
    ADD CONSTRAINT app_scheduled_challenges_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES app_users(id) ON DELETE CASCADE;

    -- Reactions
    ALTER TABLE IF EXISTS app_reactions 
    DROP CONSTRAINT IF EXISTS app_reactions_user_id_fkey,
    ADD CONSTRAINT app_reactions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE;

    RAISE NOTICE 'SUCCESS: Database is now unlocked. You can manually delete users now!';
END $$;
