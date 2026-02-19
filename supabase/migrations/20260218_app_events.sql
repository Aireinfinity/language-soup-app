-- Product analytics: event stream for user behavior (clicks, screen views, key actions).
-- Query from SQL or the admin dashboard to see what users are doing.
CREATE TABLE IF NOT EXISTS app_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    event_name text NOT NULL,
    group_id uuid REFERENCES app_groups(id) ON DELETE SET NULL,
    properties jsonb DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE app_events IS 'Product analytics: trackEvent() from the app (screen views, button clicks, voice sent, etc.). Query for funnels and behavior.';

CREATE INDEX IF NOT EXISTS idx_app_events_created_at ON app_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_events_event_name ON app_events(event_name);
CREATE INDEX IF NOT EXISTS idx_app_events_user_id ON app_events(user_id);
CREATE INDEX IF NOT EXISTS idx_app_events_group_id ON app_events(group_id);

ALTER TABLE app_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert events"
    ON app_events FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can read events (for dashboard)"
    ON app_events FOR SELECT
    USING (auth.uid() IS NOT NULL);
