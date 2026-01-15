-- CHECK_TRANSLATIONS_DATA.sql
-- Let's see if the translations are actually there for tomorrow's challenge.

SELECT 
    id,
    challenge_text,
    translations->>'Greek' as greek_preview,
    translations->>'Russian' as russian_preview
FROM app_scheduled_challenges
WHERE status = 'approved'
AND scheduled_time >= '2026-01-15 00:00:00+00'
AND scheduled_time < '2026-01-16 00:00:00+00';
