-- Leaderboard RPCs for Community tab
-- get_global_leaderboard: top users by voice memo count (last 7 days)
-- get_challenge_share_leaderboard: top users by challenge shares (last 7 days)

-- Top soupers this week (by voice message count)
CREATE OR REPLACE FUNCTION get_global_leaderboard(p_limit int DEFAULT 10)
RETURNS TABLE (
    user_id uuid,
    display_name text,
    avatar_url text,
    voice_count bigint
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT
        u.id AS user_id,
        u.display_name,
        u.avatar_url,
        COUNT(*)::bigint AS voice_count
    FROM app_messages m
    JOIN app_users u ON u.id = m.sender_id
    WHERE m.message_type = 'voice'
      AND m.created_at >= (NOW() - INTERVAL '7 days')
    GROUP BY u.id, u.display_name, u.avatar_url
    ORDER BY voice_count DESC
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 10), 100));
$$;

-- Top challengers (who shared the most challenge links, last 7 days)
CREATE OR REPLACE FUNCTION get_challenge_share_leaderboard(p_limit int DEFAULT 10)
RETURNS TABLE (
    user_id uuid,
    display_name text,
    avatar_url text,
    share_count bigint
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT
        u.id AS user_id,
        u.display_name,
        u.avatar_url,
        COUNT(*)::bigint AS share_count
    FROM challenge_shares cs
    JOIN app_users u ON u.id = cs.sharer_user_id
    WHERE cs.created_at >= (NOW() - INTERVAL '7 days')
    GROUP BY u.id, u.display_name, u.avatar_url
    ORDER BY share_count DESC
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 10), 100));
$$;
