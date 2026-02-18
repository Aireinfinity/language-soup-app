-- Share preference: can we use this user's content (photo, voice, name) on TikTok, Instagram, promo?
-- 'public' = ok to share; 'private' = don't share outside the app. Default private for safety.
ALTER TABLE app_users
ADD COLUMN IF NOT EXISTS share_preference text DEFAULT 'private'
CHECK (share_preference IS NULL OR share_preference IN ('public', 'private'));

COMMENT ON COLUMN app_users.share_preference IS 'public = ok to feature on social/marketing; private = do not share outside app. Default private.';
