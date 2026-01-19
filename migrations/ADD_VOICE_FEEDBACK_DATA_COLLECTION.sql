-- Data collection schema for voice feedback improvements
-- Run this BEFORE launching the feature to capture data from day 1

-- 1. Add opt-in column to users table
ALTER TABLE app_users 
ADD COLUMN IF NOT EXISTS share_voice_feedback BOOLEAN DEFAULT false;

-- 2. Create feedback data collection table
CREATE TABLE IF NOT EXISTS app_voice_feedback_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES app_users(id),  -- For opt-in check only
  language TEXT NOT NULL,
  transcription TEXT NOT NULL,  -- What Whisper transcribed
  corrected TEXT,  -- What AI suggested (if different)
  has_errors BOOLEAN,
  user_rating TEXT CHECK (user_rating IN ('helpful', 'not_helpful')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create indexes for analytics
CREATE INDEX IF NOT EXISTS idx_feedback_language 
ON app_voice_feedback_data(language);

CREATE INDEX IF NOT EXISTS idx_feedback_rating 
ON app_voice_feedback_data(user_rating);

CREATE INDEX IF NOT EXISTS idx_feedback_created 
ON app_voice_feedback_data(created_at);

-- 4. Add comment for documentation
COMMENT ON TABLE app_voice_feedback_data IS 
'Anonymized transcription and correction data for improving AI quality. Only stores text, never audio files. Users must opt-in via share_voice_feedback setting.';

-- 5. Verify setup
SELECT 
  'Users table' as table_name,
  COUNT(*) FILTER (WHERE share_voice_feedback = true) as opted_in_users,
  COUNT(*) as total_users
FROM app_users

UNION ALL

SELECT 
  'Feedback data' as table_name,
  COUNT(*) as records,
  0 as placeholder
FROM app_voice_feedback_data;
