-- Timezone on users (for timezone-aware challenge delivery)
ALTER TABLE public.app_users
ADD COLUMN IF NOT EXISTS timezone TEXT;

COMMENT ON COLUMN public.app_users.timezone IS 'IANA timezone e.g. America/New_York; used to send challenges at good local time.';

-- Track which users we have sent "today''s" challenge to (so we can stagger by timezone)
CREATE TABLE IF NOT EXISTS public.challenge_user_deliveries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
    scheduled_challenge_id uuid NOT NULL REFERENCES public.app_scheduled_challenges(id) ON DELETE CASCADE,
    sent_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(user_id, scheduled_challenge_id)
);

CREATE INDEX IF NOT EXISTS idx_challenge_user_deliveries_user_sent
ON public.challenge_user_deliveries(user_id, sent_at DESC);

-- Track which groups we have posted a given challenge to (one post per group per challenge)
CREATE TABLE IF NOT EXISTS public.challenge_group_posts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id uuid NOT NULL REFERENCES public.app_groups(id) ON DELETE CASCADE,
    scheduled_challenge_id uuid NOT NULL REFERENCES public.app_scheduled_challenges(id) ON DELETE CASCADE,
    posted_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(group_id, scheduled_challenge_id)
);

CREATE INDEX IF NOT EXISTS idx_challenge_group_posts_group
ON public.challenge_group_posts(group_id, posted_at DESC);
