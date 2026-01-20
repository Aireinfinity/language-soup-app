-- Count total voice messages sent since launch
SELECT 
    COUNT(*) as total_voice_messages,
    COUNT(DISTINCT sender_id) as unique_senders,
    MIN(created_at) as first_voice_message,
    MAX(created_at) as last_voice_message
FROM app_messages
WHERE message_type = 'voice';

-- Estimate average duration (if we have metadata)
-- This would help calculate cost more accurately
SELECT 
    COUNT(*) as total_voice_messages,
    -- Assuming average voice message is 30 seconds
    COUNT(*) * 0.5 as estimated_total_minutes,
    -- OpenAI Whisper cost: $0.006 per minute
    COUNT(*) * 0.5 * 0.006 as estimated_cost_usd
FROM app_messages
WHERE message_type = 'voice';

-- Voice messages per day (to estimate ongoing cost)
SELECT 
    DATE(created_at) as date,
    COUNT(*) as voice_messages_per_day
FROM app_messages
WHERE message_type = 'voice'
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
