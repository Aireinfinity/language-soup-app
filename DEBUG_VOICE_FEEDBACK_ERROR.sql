-- Check recent edge function errors
-- Go to: https://supabase.com/dashboard/project/uspegyneclgkscxwmomn/logs/edge-functions
-- Filter by: voice-feedback
-- Look for errors in last 10 minutes

-- Common issues:
-- 1. Missing API keys (HUGGINGFACE_API_KEY, GROQ_API_KEY, ELEVENLABS_API_KEY)
-- 2. Invalid audio URL
-- 3. Audio file not accessible
-- 4. API rate limits exceeded

-- To check if API keys are set:
-- Go to: https://supabase.com/dashboard/project/uspegyneclgkscxwmomn/settings/functions
-- Check "Secrets" section
-- Should see: HUGGINGFACE_API_KEY, GROQ_API_KEY, ELEVENLABS_API_KEY

-- To test manually, get a voice memo URL:
SELECT 
    m.id,
    m.media_url,
    m.sender_id,
    g.language
FROM app_messages m
JOIN app_groups g ON m.group_id = g.id
WHERE m.message_type = 'voice'
  AND m.sender_id = '29864936-719c-483b-ac6a-4d06084a48fe'  -- Noah
ORDER BY m.created_at DESC
LIMIT 1;
