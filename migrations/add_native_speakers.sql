-- Feature 7: Native Speaker Scheduling
-- Database schema for native speakers, availability, and future bookings

-- 1. Native Speakers Table
CREATE TABLE IF NOT EXISTS app_native_speakers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    languages TEXT[] NOT NULL, -- Languages they teach (e.g., ['French', 'English'])
    bio TEXT,
    hourly_rate DECIMAL(10,2), -- Optional for future paid features
    contact_email TEXT,
    contact_whatsapp TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast language filtering
CREATE INDEX IF NOT EXISTS idx_native_speakers_languages 
ON app_native_speakers USING GIN(languages);

-- 2. Speaker Availability Table
CREATE TABLE IF NOT EXISTS app_speaker_availability (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    speaker_id UUID REFERENCES app_native_speakers(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL, -- 0=Sunday, 1=Monday, ..., 6=Saturday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'America/Los_Angeles',
    is_active BOOLEAN DEFAULT true,
    UNIQUE(speaker_id, day_of_week, start_time)
);

-- Index for querying availability
CREATE INDEX IF NOT EXISTS idx_speaker_availability_speaker 
ON app_speaker_availability(speaker_id, is_active);

-- 3. Bookings Table (Future enhancement - not used in MVP)
CREATE TABLE IF NOT EXISTS app_bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    speaker_id UUID REFERENCES app_native_speakers(id) ON DELETE CASCADE,
    learner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMP NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    status TEXT DEFAULT 'pending', -- pending, confirmed, cancelled, completed
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Enable RLS
ALTER TABLE app_native_speakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_speaker_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_bookings ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies - Allow public read access to active speakers
CREATE POLICY "Anyone can view active speakers"
ON app_native_speakers FOR SELECT
USING (is_active = true);

CREATE POLICY "Anyone can view speaker availability"
ON app_speaker_availability FOR SELECT
USING (is_active = true);

CREATE POLICY "Users can view their own bookings"
ON app_bookings FOR SELECT
USING (auth.uid() = learner_id OR auth.uid() IN (SELECT user_id FROM app_native_speakers WHERE id = speaker_id));

CREATE POLICY "Users can create bookings"
ON app_bookings FOR INSERT
WITH CHECK (auth.uid() = learner_id);

-- 6. Seed Sample Data
INSERT INTO app_native_speakers (display_name, languages, bio, contact_email, contact_whatsapp, avatar_url)
VALUES 
(
    'Sophie Laurent', 
    ARRAY['French'], 
    'Native Parisian with 5 years teaching experience. I love helping beginners gain confidence through natural conversation!',
    'sophie@language-soup.com',
    '+33612345678',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200'
),
(
    'Carlos Mendez', 
    ARRAY['Spanish'], 
    'From Mexico City. Specialized in conversational Spanish and business vocabulary. Let''s chat!',
    'carlos@language-soup.com',
    '+52112233445',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200'
),
(
    'Yuki Tanaka', 
    ARRAY['Japanese'], 
    'Tokyo native, fluent in English. Patient with all levels, from complete beginners to advanced learners.',
    'yuki@language-soup.com',
    '+819012345678',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200'
)
ON CONFLICT DO NOTHING;

-- Add sample availability for Sophie (French speaker)
WITH sophie AS (SELECT id FROM app_native_speakers WHERE display_name = 'Sophie Laurent' LIMIT 1)
INSERT INTO app_speaker_availability (speaker_id, day_of_week, start_time, end_time, timezone)
SELECT id, day, time '14:00', time '17:00', 'Europe/Paris'
FROM sophie, unnest(ARRAY[1,2,3,4,5]) AS day -- Mon-Fri
ON CONFLICT DO NOTHING;

-- Add sample availability for Carlos (Spanish speaker)
WITH carlos AS (SELECT id FROM app_native_speakers WHERE display_name = 'Carlos Mendez' LIMIT 1)
INSERT INTO app_speaker_availability (speaker_id, day_of_week, start_time, end_time, timezone)
SELECT id, day, time '18:00', time '21:00', 'America/Mexico_City'
FROM carlos, unnest(ARRAY[1,3,5]) AS day -- Mon, Wed, Fri
ON CONFLICT DO NOTHING;
