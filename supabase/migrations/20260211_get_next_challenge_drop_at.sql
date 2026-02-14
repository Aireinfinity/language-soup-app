-- Returns the next scheduled challenge drop time (from dashboard queue).
-- Used by the app to show "next challenge in Xh Ym" instead of counting to midnight.
-- Only returns a timestamp; no challenge content is exposed.

CREATE OR REPLACE FUNCTION get_next_challenge_drop_at()
RETURNS timestamptz
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT MIN(scheduled_time)
  FROM app_scheduled_challenges
  WHERE status IN ('pending', 'approved')
    AND scheduled_time > NOW();
$$;

COMMENT ON FUNCTION get_next_challenge_drop_at() IS 'Next challenge drop time from dashboard schedule; for app countdown timer.';

-- Allow authenticated app users to call it (no sensitive data returned)
GRANT EXECUTE ON FUNCTION get_next_challenge_drop_at() TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_challenge_drop_at() TO anon;
