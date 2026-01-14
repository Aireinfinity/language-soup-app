-- FINAL_CONTENT_AUDIT.sql
-- Get everything for tomorrow's challenge to answer the user's specifics.

SELECT 
    scheduled_time,
    challenge_text as english_text,
    translations->>'Portuguese' as portuguese_text,
    translations->>'Tagalog' as tagalog_text
FROM app_scheduled_challenges
WHERE status = 'approved'
AND scheduled_time >= '2026-01-15 00:00:00+00'
AND scheduled_time < '2026-01-16 00:00:00+00';
