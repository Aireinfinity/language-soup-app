-- Add metadata column to app_challenges (the live table)
ALTER TABLE app_challenges 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Comment to explain structure
COMMENT ON COLUMN app_challenges.metadata IS 'Stores flexible data like sample_phrases and vocab_bank';
