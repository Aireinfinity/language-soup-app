-- Atomic dedup: claim the right to notify each user (one notification per user per 2 min).
-- Edge function calls this; only sends push to returned user_ids so concurrent invocations don't spam.
CREATE OR REPLACE FUNCTION claim_challenge_reply_notification_slots(user_ids uuid[])
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM challenge_reply_notification_sent
  WHERE sent_at < now() - interval '2 minutes';

  INSERT INTO challenge_reply_notification_sent (user_id, sent_at)
  SELECT id, now()
  FROM unnest(user_ids) AS id
  ON CONFLICT (user_id) DO NOTHING
  RETURNING user_id;
$$;

COMMENT ON FUNCTION claim_challenge_reply_notification_slots IS 'Returns user_ids we are allowed to send a challenge-reply push to (max 1 per user per 2 min). Call from notify-challenge-reply Edge Function.';
