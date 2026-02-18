-- So we only send one "someone replied to the challenge" per user per 2 minutes (avoids spam when one person replies in many groups).
CREATE TABLE IF NOT EXISTS challenge_reply_notification_sent (
    user_id uuid NOT NULL,
    sent_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id)
);

COMMENT ON TABLE challenge_reply_notification_sent IS 'Tracks last time we sent a challenge-reply push to each user; used to dedupe so max 1 per user per 2 min.';

-- RLS: only service role / edge functions need access (no app access)
ALTER TABLE challenge_reply_notification_sent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only"
    ON challenge_reply_notification_sent
    FOR ALL
    USING (false)
    WITH CHECK (false);
