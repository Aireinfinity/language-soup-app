-- 1. CLEANUP: Remove any/all old cron jobs to be safe
SELECT cron.unschedule('process-scheduled-challenges-simple');
SELECT cron.unschedule('process-scheduled-challenges-v2');

-- 2. INSTALL: The corrected Cron Job
-- Runs every minute (* * * * *)
SELECT cron.schedule(
    'process-scheduled-challenges-v2',
    '* * * * *',
    $$
    -- A. Transaction to ensure atomicity
    BEGIN;

        -- B. Insert into app_challenges (Fan out to ALL groups)
        INSERT INTO app_challenges (group_id, prompt_text, created_by, created_at)
        SELECT 
            g.id,
            CASE 
                -- If text already starts with #challenge, leave it, else add it
                WHEN s.challenge_text ILIKE '#challenge%' THEN s.challenge_text
                ELSE '#challenge' || E'\n' || s.challenge_text
            END,
            s.created_by,
            NOW()
        FROM app_scheduled_challenges s
        CROSS JOIN app_groups g
        WHERE s.status = 'approved'    -- CORRECTED: Look for 'approved'
          AND s.scheduled_time <= NOW();

        -- C. Mark them as sent
        UPDATE app_scheduled_challenges
        SET status = 'sent'
        WHERE status = 'approved'      -- CORRECTED: Look for 'approved'
          AND scheduled_time <= NOW();

    COMMIT;
    $$
);

-- 3. VERIFY: Show the active jobs
SELECT * FROM cron.job;
