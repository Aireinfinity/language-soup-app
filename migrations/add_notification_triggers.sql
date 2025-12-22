-- Database triggers to send push notifications for new challenges only
-- This will notify all users in the group when a new challenge is created
-- Features: Random hype messages + slang language greetings + custom emojis + country flags

-- NOTE: Replace 'YOUR_SUPABASE_PROJECT_URL' with your actual Supabase project URL
-- Example: https://abcdefghijklmnop.supabase.co

-- Trigger for new challenges
CREATE OR REPLACE FUNCTION notify_new_challenge()
RETURNS TRIGGER AS $$
DECLARE
    recipient_record RECORD;
    supabase_url TEXT := 'YOUR_SUPABASE_PROJECT_URL'; -- REPLACE THIS
    supabase_anon_key TEXT := 'YOUR_SUPABASE_ANON_KEY'; -- REPLACE THIS
    group_name TEXT;
    notification_body TEXT;
    random_choice INTEGER;
    language_message TEXT;
    country_flag TEXT;
BEGIN
    -- Get group name
    SELECT name INTO group_name
    FROM app_groups
    WHERE id = NEW.group_id;

    -- Get language-specific slang message and random country flag
    CASE 
        WHEN group_name ILIKE '%french%' THEN
            language_message := 'salut! nouveau défi là, viens vite!';
            -- Random flag: France, Senegal, Morocco, Haiti, Belgium
            country_flag := (ARRAY['🇫🇷', '🇸🇳', '🇲🇦', '🇭🇹', '🇧🇪'])[floor(random() * 5 + 1)];
        WHEN group_name ILIKE '%spanish%' THEN
            language_message := '¡ey! nuevo reto hoy, dale!';
            -- Random flag: Mexico, Spain, Argentina, Colombia, Peru
            country_flag := (ARRAY['🇲🇽', '🇪🇸', '🇦🇷', '🇨🇴', '🇵🇪'])[floor(random() * 5 + 1)];
        WHEN group_name ILIKE '%german%' THEN
            language_message := 'hey! neue challenge heute, komm!';
            -- Random flag: Germany, Austria, Switzerland
            country_flag := (ARRAY['🇩🇪', '🇦🇹', '🇨🇭'])[floor(random() * 3 + 1)];
        WHEN group_name ILIKE '%italian%' THEN
            language_message := 'ehi! nuova sfida oggi, dai!';
            -- Random flag: Italy, Switzerland
            country_flag := (ARRAY['🇮🇹', '🇨🇭'])[floor(random() * 2 + 1)];
        WHEN group_name ILIKE '%portuguese%' THEN
            language_message := 'oi! novo desafio hoje, bora!';
            -- Random flag: Brazil, Portugal, Angola, Mozambique
            country_flag := (ARRAY['🇧🇷', '🇵🇹', '🇦🇴', '🇲🇿'])[floor(random() * 4 + 1)];
        WHEN group_name ILIKE '%mandarin%' OR group_name ILIKE '%chinese%' THEN
            language_message := '嘿！今天新挑战，来吧！';
            -- Random flag: China, Taiwan, Singapore
            country_flag := (ARRAY['🇨🇳', '🇹🇼', '🇸🇬'])[floor(random() * 3 + 1)];
        WHEN group_name ILIKE '%japanese%' THEN
            language_message := 'おい！今日の新チャレンジ、来て！';
            country_flag := '🇯🇵';
        WHEN group_name ILIKE '%korean%' THEN
            language_message := '야! 오늘 새 도전, 와!';
            country_flag := '🇰🇷';
        WHEN group_name ILIKE '%arabic%' THEN
            language_message := 'يلا! تحدي جديد اليوم!';
            -- Random flag: Egypt, Morocco, UAE, Saudi Arabia, Lebanon
            country_flag := (ARRAY['🇪🇬', '🇲🇦', '🇦🇪', '🇸🇦', '🇱🇧'])[floor(random() * 5 + 1)];
        WHEN group_name ILIKE '%russian%' THEN
            language_message := 'эй! новый вызов сегодня, давай!';
            country_flag := '🇷🇺';
        ELSE
            language_message := NULL;
            country_flag := '🌍';
    END CASE;

    -- Randomly choose between option 1, 2, or language-specific (1-3)
    random_choice := floor(random() * 3 + 1)::INTEGER;

    -- Build notification body based on random choice
    CASE random_choice
        WHEN 1 THEN
            notification_body := 'bro ur late the challenge is here! 😭 ' || group_name;
        WHEN 2 THEN
            notification_body := 'wait wait wait... new challenge? hell yeah! 😵‍💫 ' || group_name;
        WHEN 3 THEN
            -- Use language-specific message if available, otherwise fallback to option 1
            IF language_message IS NOT NULL THEN
                notification_body := language_message || ' ' || country_flag || ' ' || group_name;
            ELSE
                notification_body := 'bro ur late the challenge is here! 😭 ' || group_name;
            END IF;
    END CASE;

    -- Notify all users in the group where the challenge was created
    FOR recipient_record IN
        SELECT DISTINCT gm.user_id
        FROM app_group_members gm
        WHERE gm.group_id = NEW.group_id
    LOOP
        -- Call Edge Function to send push notification
        PERFORM net.http_post(
            url := supabase_url || '/functions/v1/send-push-notification',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || supabase_anon_key
            ),
            body := jsonb_build_object(
                'userId', recipient_record.user_id,
                'type', 'challenge',
                'title', '',
                'body', notification_body,
                'data', jsonb_build_object(
                    'challengeId', NEW.id,
                    'groupId', NEW.group_id,
                    'type', 'challenge'
                )
            )
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for challenges
DROP TRIGGER IF EXISTS trigger_notify_new_challenge ON app_challenges;
CREATE TRIGGER trigger_notify_new_challenge
    AFTER INSERT ON app_challenges
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_challenge();

