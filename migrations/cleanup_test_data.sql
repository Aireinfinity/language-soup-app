-- Clean up test data and fix member counts
-- Run this to reset the database to production-ready state

-- 1. Delete group member records for non-admins
DELETE FROM app_group_members
WHERE user_id IN (
    SELECT id FROM app_users 
    WHERE role IS DISTINCT FROM 'admin'
);

-- 2. Delete messages from non-admins
DELETE FROM app_messages 
WHERE sender_id IN (
    SELECT id FROM app_users 
    WHERE role IS DISTINCT FROM 'admin'
);

-- 3. Delete all non-admin users
DELETE FROM app_users 
WHERE role IS DISTINCT FROM 'admin';

-- 4. Delete ALL support messages (Clean Slate)
DELETE FROM app_support_messages;

-- 4b. Delete ALL language requests (Clean Slate)
DELETE FROM app_language_requests;

-- 4. Update member counts to be accurate based on actual group memberships
UPDATE app_groups g
SET member_count = (
    SELECT COUNT(DISTINCT gm.user_id)
    FROM app_group_members gm
    WHERE gm.group_id = g.id
);

-- 5. Create trigger to automatically update member counts when users join/leave
CREATE OR REPLACE FUNCTION update_group_member_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE app_groups 
        SET member_count = member_count + 1
        WHERE id = NEW.group_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE app_groups 
        SET member_count = GREATEST(0, member_count - 1)
        WHERE id = OLD.group_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_group_member_count ON app_group_members;

-- Create the trigger
CREATE TRIGGER trigger_update_group_member_count
AFTER INSERT OR DELETE ON app_group_members
FOR EACH ROW
EXECUTE FUNCTION update_group_member_count();

-- 6. Verify the counts are correct
SELECT 
    g.name,
    g.member_count as stored_count,
    COUNT(DISTINCT gm.user_id) as actual_count
FROM app_groups g
LEFT JOIN app_group_members gm ON g.id = gm.group_id
GROUP BY g.id, g.name, g.member_count
ORDER BY g.name;

-- HELPER: Delete duplicate admins (Delete incomplete profiles)
-- This deletes admins who are missing an avatar
DELETE FROM app_users 
WHERE role = 'admin' 
AND (avatar_url IS NULL OR avatar_url = '');
