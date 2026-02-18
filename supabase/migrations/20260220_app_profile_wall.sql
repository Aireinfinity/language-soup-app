-- Profile wall: short text posts on a user's profile (e.g. "I love your profile!")
CREATE TABLE IF NOT EXISTS app_profile_wall (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    from_user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profile_wall_profile_user ON app_profile_wall(profile_user_id);
CREATE INDEX IF NOT EXISTS idx_profile_wall_created_at ON app_profile_wall(profile_user_id, created_at DESC);

ALTER TABLE app_profile_wall ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read wall posts"
ON app_profile_wall FOR SELECT USING (true);

CREATE POLICY "Authenticated users can post on any profile"
ON app_profile_wall FOR INSERT WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can delete their own wall posts"
ON app_profile_wall FOR DELETE USING (auth.uid() = from_user_id);
