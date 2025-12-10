-- Add updated_at to app_language_requests
ALTER TABLE IF EXISTS app_language_requests 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Also ensure app_support_messages has it (just in case)
ALTER TABLE IF EXISTS app_support_messages
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
