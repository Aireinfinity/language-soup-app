-- Add 'anonymized' option to share_preference: ok to use tagline/quotes/progress in marketing but no name/photo.
ALTER TABLE app_users
DROP CONSTRAINT IF EXISTS app_users_share_preference_check;

ALTER TABLE app_users
ADD CONSTRAINT app_users_share_preference_check
CHECK (share_preference IS NULL OR share_preference IN ('public', 'private', 'anonymized'));

COMMENT ON COLUMN app_users.share_preference IS 'private = do not share outside app (default). anonymized = can use tagline/quotes/progress in posts, no name or photo. public = ok to feature with name/face on social.';
