-- Record when a user skips a challenge (vs sending a reply). Used so we never treat "skipped" as "done".
CREATE TABLE IF NOT EXISTS app_challenge_skips (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    challenge_id uuid NOT NULL REFERENCES app_challenges(id) ON DELETE CASCADE,
    skipped_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, challenge_id)
);

COMMENT ON TABLE app_challenge_skips IS 'Tracks when user skipped a challenge (no message sent). Distinguishes skip vs send for analytics and UI.';

CREATE INDEX IF NOT EXISTS idx_app_challenge_skips_user_id ON app_challenge_skips(user_id);
CREATE INDEX IF NOT EXISTS idx_app_challenge_skips_challenge_id ON app_challenge_skips(challenge_id);

ALTER TABLE app_challenge_skips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own skips"
    ON app_challenge_skips FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own skips"
    ON app_challenge_skips FOR SELECT
    USING (auth.uid() = user_id);
