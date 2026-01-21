-- Add metadata column to app_scheduled_challenges
ALTER TABLE app_scheduled_challenges 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Comment to explain structure
COMMENT ON COLUMN app_scheduled_challenges.metadata IS 'Stores flexible data like sample_phrases and vocab_bank';
