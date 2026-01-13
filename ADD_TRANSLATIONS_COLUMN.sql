-- Add translations column to store the multi-language text
ALTER TABLE app_scheduled_challenges 
ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}'::JSONB;
