-- =========================================================
-- LANGUAGE NOTIFICATIONS TABLE
-- =========================================================
-- This table stores notification messages for each language
-- Add new languages here instead of hardcoding in the app

CREATE TABLE IF NOT EXISTS app_language_notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    language text UNIQUE NOT NULL,
    country_flag text NOT NULL,
    notification_message text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Seed with current languages
INSERT INTO app_language_notifications (language, country_flag, notification_message) VALUES
('french', '🇫🇷', 'salut! nouveau défi aujourd''hui! viens vite!'),
('spanish', '🇲🇽', '¡hola! ¡nuevo desafío hoy! ven ya!'),
('german', '🇩🇪', 'hey! neue challenge heute! komm schon!'),
('italian', '🇮🇹', 'ciao! nuova sfida oggi! dai vieni!'),
('portuguese', '🇧🇷', 'oi! novo desafio hoje! bora lá!'),
('mandarin', '🇨🇳', '嘿！今天有新挑战！快来！'),
('japanese', '🇯🇵', 'おい！今日の新チャレンジ！来て！'),
('korean', '🇰🇷', '야! 오늘 새 도전! 와!'),
('arabic', '🇸🇦', 'يلا! تحدي جديد اليوم! تعال!'),
('russian', '🇷🇺', 'привет! новый челлендж сегодня! давай!'),
('swedish', '🇸🇪', 'hej! ny utmaning idag! kom nu!'),
('hungarian', '🇭🇺', 'szia! új kihívás ma! gyere!'),
('tagalog', '🇵🇭', 'hoy! bagong challenge ngayon! halika na!'),
('yoruba', '🇳🇬', 'bawo! ipenija tuntun loni! wa!'),
('farsi', '🇮🇷', 'سلام! چالش جدید امروز! بیا!'),
('dutch', '🇳🇱', 'hoi! nieuwe challenge vandaag! kom op!')
ON CONFLICT (language) DO UPDATE SET
    country_flag = EXCLUDED.country_flag,
    notification_message = EXCLUDED.notification_message,
    updated_at = now();

-- Enable RLS
ALTER TABLE app_language_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on app_language_notifications" ON app_language_notifications FOR ALL USING (true) WITH CHECK (true);

-- =========================================================
-- HOW TO ADD NEW LANGUAGES:
-- =========================================================
-- Just run this SQL with your new language:
-- INSERT INTO app_language_notifications (language, country_flag, notification_message)
-- VALUES ('polish', '🇵🇱', 'cześć! nowe wyzwanie dzisiaj! chodź!');
