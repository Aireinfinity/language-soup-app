-- get_or_create_dm: find or create a 2-person "DM" group for two users.
-- Uses existing app_groups + app_group_members (same as group chat).
-- Caller must be one of the two users.

CREATE OR REPLACE FUNCTION get_or_create_dm(uid_a uuid, uid_b uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    existing_group_id uuid;
    new_group_id uuid;
BEGIN
    -- Caller must be one of the two participants
    IF auth.uid() IS NULL OR (auth.uid() != uid_a AND auth.uid() != uid_b) THEN
        RAISE EXCEPTION 'Not allowed: only participants can start a DM';
    END IF;

    IF uid_a = uid_b THEN
        RAISE EXCEPTION 'Cannot start a DM with yourself';
    END IF;

    -- Find existing DM group with exactly these two members
    SELECT g.id INTO existing_group_id
    FROM app_groups g
    INNER JOIN app_group_members m1 ON m1.group_id = g.id AND m1.user_id = uid_a
    INNER JOIN app_group_members m2 ON m2.group_id = g.id AND m2.user_id = uid_b
    WHERE g.name = 'DM'
    LIMIT 1;

    IF existing_group_id IS NOT NULL THEN
        RETURN existing_group_id;
    END IF;

    -- Create new DM group (is_visible = false so it doesn't show in browse groups)
    INSERT INTO app_groups (name, language, member_count, is_visible)
    VALUES ('DM', 'DM', 2, false)
    RETURNING id INTO new_group_id;

    INSERT INTO app_group_members (user_id, group_id, role)
    VALUES
        (uid_a, new_group_id, 'member'),
        (uid_b, new_group_id, 'member');

    RETURN new_group_id;
END;
$$;

COMMENT ON FUNCTION get_or_create_dm(uuid, uuid) IS 'Returns group id for the DM between uid_a and uid_b; creates the group if it does not exist.';
