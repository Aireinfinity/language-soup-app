-- =========================================================
-- MIGRATION: Profile Redesign & Analytics Upgrade
-- =========================================================

-- 1. Add New Profile Columns to app_users
-- Using "IF NOT EXISTS" to make it safe to run multiple times
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_users' AND column_name = 'bio') THEN
        ALTER TABLE app_users ADD COLUMN bio TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_users' AND column_name = 'location') THEN
        ALTER TABLE app_users ADD COLUMN location TEXT; -- "I live in..."
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_users' AND column_name = 'origin') THEN
        ALTER TABLE app_users ADD COLUMN origin TEXT; -- "I'm from..."
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_users' AND column_name = 'fluent_languages') THEN
        ALTER TABLE app_users ADD COLUMN fluent_languages TEXT[]; -- Array of languages
    END IF;
END $$;


-- 2. Upgrade get_user_stats Function
-- Includes Monthly Stats for "Wrapped" Card and Hours Calculation

CREATE OR REPLACE FUNCTION get_user_stats(uid uuid)
RETURNS json AS $$
DECLARE
    -- All-Time Stats
    total_seconds INTEGER;
    
    -- Monthly Stats (Current Month)
    monthly_seconds INTEGER;
    monthly_top_lang TEXT;
    monthly_top_lang_seconds INTEGER;
    
    -- Consistency
    last_active TIMESTAMPTZ;
    consistency_label TEXT;
    
    -- Breakdown
    flavor_breakdown json;
    
    -- Result
    result json;
    
    -- Date Helpers
    start_of_month TIMESTAMPTZ := date_trunc('month', NOW());
BEGIN
    -- A. All-Time Total
    SELECT COALESCE(SUM(duration_seconds), 0) INTO total_seconds
    FROM app_messages
    WHERE sender_id = uid AND message_type = 'voice';

    -- B. Monthly Total
    SELECT COALESCE(SUM(duration_seconds), 0) INTO monthly_seconds
    FROM app_messages
    WHERE sender_id = uid 
      AND message_type = 'voice'
      AND created_at >= start_of_month;

    -- C. Monthly Top Language (Best effort based on Group Language)
    SELECT 
        g.language, 
        SUM(m.duration_seconds) as secs
    INTO monthly_top_lang, monthly_top_lang_seconds
    FROM app_messages m
    JOIN app_groups g ON m.group_id = g.id
    WHERE m.sender_id = uid 
      AND m.message_type = 'voice'
      AND m.created_at >= start_of_month
    GROUP BY g.language
    ORDER BY secs DESC
    LIMIT 1;

    -- D. Consistency Label (Based on last 7 days frequency?)
    -- Let's stick to Recency for now, or improve logic
    SELECT MAX(created_at) INTO last_active
    FROM app_messages WHERE sender_id = uid;

    IF last_active > NOW() - INTERVAL '24 hours' THEN
        consistency_label := 'Consistent Souper 🍜'; -- Hot
    ELSIF last_active > NOW() - INTERVAL '3 days' THEN
        consistency_label := 'Casual Sipper 🥣'; -- Warm
    ELSIF monthly_seconds > 600 THEN -- > 10 mins this month matches "Binge" maybe?
        consistency_label := 'Binge Learner 🌪️';
    ELSE
        consistency_label := 'Lukewarm ❄️';
    END IF;

    -- E. Flavor Profile (All-Time Breakdown for Progress Bars)
    SELECT json_agg(t) INTO flavor_breakdown
    FROM (
        SELECT 
            g.language,
            COALESCE(SUM(m.duration_seconds), 0) as seconds
        FROM app_messages m
        JOIN app_groups g ON m.group_id = g.id
        WHERE m.sender_id = uid AND m.message_type = 'voice'
        GROUP BY g.language
        ORDER BY seconds DESC
    ) t;

    -- F. Construct JSON
    result := json_build_object(
        'total_speaking_seconds', total_seconds,
        'monthly_speaking_seconds', monthly_seconds,
        'monthly_top_language', COALESCE(monthly_top_lang, 'None'),
        'monthly_top_language_seconds', COALESCE(monthly_top_lang_seconds, 0),
        'consistency_label', COALESCE(consistency_label, 'Newbie 🌱'),
        'flavor_breakdown', COALESCE(flavor_breakdown, '[]'::json)
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 3. Seed some dummy data for the new profile fields for testing
UPDATE app_users 
SET 
    bio = 'Just here to slurp some language soup! 🍜',
    location = 'New York, USA',
    origin = 'Phillippines',
    fluent_languages = ARRAY['English', 'Tagalog']
WHERE id = 'b95021fe-ce61-4cc0-974a-8a6f6973f6f3' -- Replace with your actual User ID if different, but this works for the test user
   OR display_name = 'You'; 
