-- Noah's support status: at_desk | on_the_go | sleeping. Set from dashboard (Castle) or app (Noah's profile).
-- Only Noah's row uses this; others stay null. If null, app can infer (e.g. sleeping 11pm–6am LA).
ALTER TABLE app_users
ADD COLUMN IF NOT EXISTS availability_override text;

COMMENT ON COLUMN app_users.availability_override IS 'Noah only: at_desk | on_the_go | sleeping. Drives "Chat with Noah" status in app and dashboard.';
