-- Challenge drop: at most one notification per user per "batch" (e.g. same day or 10 min window).
-- When webhook fires per app_challenges INSERT (one per group), we claim slots so only the first
-- invocation per user wins; later groups see that user already claimed and skip.
CREATE TABLE IF NOT EXISTS challenge_drop_notification_sent (
    user_id uuid NOT NULL PRIMARY KEY,
    sent_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE challenge_drop_notification_sent IS 'Tracks users we already sent a challenge-drop push to in this batch; one notification per user across all groups.';

ALTER TABLE challenge_drop_notification_sent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only"
    ON challenge_drop_notification_sent
    FOR ALL
    USING (false)
    WITH CHECK (false);

-- Returns user_ids we are allowed to notify (not already sent in last 10 minutes).
CREATE OR REPLACE FUNCTION claim_challenge_drop_notification_slots(user_ids uuid[])
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM challenge_drop_notification_sent
  WHERE sent_at < now() - interval '10 minutes';

  INSERT INTO challenge_drop_notification_sent (user_id, sent_at)
  SELECT id, now()
  FROM unnest(user_ids) AS id
  ON CONFLICT (user_id) DO NOTHING
  RETURNING user_id;
$$;

COMMENT ON FUNCTION claim_challenge_drop_notification_slots IS 'Returns user_ids we may send a challenge-drop push to (max 1 per user per 10 min). Call from send-push-notification when handling app_challenges INSERT.';
