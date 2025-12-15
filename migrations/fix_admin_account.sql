-- MIGRATE OLD ADMIN DATA TO NEW LOGIN
-- Old ID: b95021fe-ce61-4cc0-974a-8a6f6973f6f3 (The 'Founder Daddy' profile)
-- New ID: 4d683957-8262-4874-b36c-d53bd99e8886 (The one you are currently logged in as)

DO $$
DECLARE
    old_id UUID := 'b95021fe-ce61-4cc0-974a-8a6f6973f6f3';
    new_id UUID := '4d683957-8262-4874-b36c-d53bd99e8886';
BEGIN
    -- 1. Copy Profile Data (Bio, Avatar, Role, etc.) from Old to New
    UPDATE app_users
    SET 
        bio = old.bio,
        location = old.location,
        origin = old.origin,
        fluent_languages = old.fluent_languages,
        learning_languages = old.learning_languages,
        avatar_url = old.avatar_url,
        role = 'admin', -- Ensure new user is admin
        is_admin = true
    FROM app_users old
    WHERE app_users.id = new_id AND old.id = old_id;

    -- 2. Reassign Group Memberships
    -- Delete any temporary memberships the new user might have created to avoid conflicts
    DELETE FROM app_group_members WHERE user_id = new_id;
    -- Move old memberships to new ID
    UPDATE app_group_members SET user_id = new_id WHERE user_id = old_id;

    -- 3. Reassign Messages (So you own your old texts)
    UPDATE app_messages SET sender_id = new_id WHERE sender_id = old_id;

    -- 4. Reassign Support Messages
    UPDATE app_support_messages SET user_id = new_id WHERE user_id = old_id;

    -- 5. Reassign Language Requests
    UPDATE app_language_requests SET user_id = new_id WHERE user_id = old_id;

    -- 6. Delete the Old Ghost Record
    DELETE FROM app_users WHERE id = old_id;

END $$;
