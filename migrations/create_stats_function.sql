-- =========================================================
-- FUNCTION: Get User Stats (Flavor Profile & Consistency)
-- =========================================================

CREATE OR REPLACE FUNCTION get_user_stats(uid uuid)
RETURNS json AS $$
DECLARE
    total_seconds INTEGER;
    last_active TIMESTAMPTZ;
    consistency_label TEXT;
    flavor_breakdown json;
    result json;
BEGIN
    -- 1. Calculate Total Speaking Time
    SELECT COALESCE(SUM(duration_seconds), 0)
    INTO total_seconds
    FROM app_messages
    WHERE sender_id = uid
      AND message_type = 'voice';

    -- 2. Determine "Soup Consistency" (Status)
    SELECT MAX(created_at)
    INTO last_active
    FROM app_messages
    WHERE sender_id = uid;

    IF last_active > NOW() - INTERVAL '24 hours' THEN
        consistency_label := 'Boiling 🔥';
    ELSIF last_active > NOW() - INTERVAL '3 days' THEN
        consistency_label := 'Simmering ♨️';
    ELSE
        consistency_label := 'Lukewarm ❄️';
    END IF;

    -- 3. Calculate "Flavor Profile" (Breakdown by Group)
    SELECT json_agg(t)
    INTO flavor_breakdown
    FROM (
        SELECT 
            g.name as group_name,
            g.language,
            COALESCE(SUM(m.duration_seconds), 0) as seconds
        FROM app_messages m
        JOIN app_groups g ON m.group_id = g.id
        WHERE m.sender_id = uid AND m.message_type = 'voice'
        GROUP BY g.id, g.name, g.language
        ORDER BY seconds DESC
    ) t;

    -- 4. Construct Final JSON
    result := json_build_object(
        'total_speaking_seconds', total_seconds,
        'consistency_label', COALESCE(consistency_label, 'Lukewarm ❄️'),
        'flavor_breakdown', COALESCE(flavor_breakdown, '[]'::json)
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Test:
-- SELECT get_user_stats('YOUR_USER_ID');
