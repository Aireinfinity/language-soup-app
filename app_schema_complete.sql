-- ============================================
-- CLEAN SLATE: Drop all app tables first
-- ============================================
DROP TABLE IF EXISTS app_message_reactions CASCADE;
DROP TABLE IF EXISTS app_support_messages CASCADE;
DROP TABLE IF EXISTS app_language_requests CASCADE;
DROP TABLE IF EXISTS app_messages CASCADE;
DROP TABLE IF EXISTS app_challenges CASCADE;
DROP TABLE IF EXISTS app_group_members CASCADE;
DROP TABLE IF EXISTS app_groups CASCADE;
DROP TABLE IF EXISTS app_users CASCADE;

-- ============================================
-- 1. APP USERS (like WhatsApp contacts)
-- ============================================
CREATE TABLE app_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number text UNIQUE,
    display_name text NOT NULL,
    avatar_url text,
    status_text text,
    last_seen timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- ============================================
-- 2. APP GROUPS (language groups for app)
-- ============================================
CREATE TABLE app_groups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    avatar_url text,
    language text,
    level text,
    is_active boolean DEFAULT true,
    member_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);

-- ============================================
-- 3. APP GROUP MEMBERS (who's in which group)
-- ============================================
CREATE TABLE app_group_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES app_users(id) ON DELETE CASCADE NOT NULL,
    group_id uuid REFERENCES app_groups(id) ON DELETE CASCADE NOT NULL,
    role text DEFAULT 'member',
    joined_at timestamp with time zone DEFAULT now(),
    last_read_at timestamp with time zone,
    notifications_enabled boolean DEFAULT true,
    UNIQUE(user_id, group_id)
);

-- ============================================
-- 4. APP CHALLENGES (daily prompts)
-- ============================================
CREATE TABLE app_challenges (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id uuid REFERENCES app_groups(id) ON DELETE CASCADE NOT NULL,
    prompt_text text NOT NULL,
    prompt_text_target_language text,
    created_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone
);

-- ============================================
-- 5. APP MESSAGES (chat messages)
-- ============================================
CREATE TABLE app_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id uuid REFERENCES app_users(id) ON DELETE CASCADE NOT NULL,
    group_id uuid REFERENCES app_groups(id) ON DELETE CASCADE NOT NULL,
    challenge_id uuid REFERENCES app_challenges(id) ON DELETE SET NULL,
    message_type text NOT NULL DEFAULT 'text',
    content text,
    media_url text,
    duration_seconds integer,
    created_at timestamp with time zone DEFAULT now(),
    edited_at timestamp with time zone,
    deleted_at timestamp with time zone
);

-- ============================================
-- 6. APP MESSAGE REACTIONS
-- ============================================
CREATE TABLE app_message_reactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id uuid REFERENCES app_messages(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES app_users(id) ON DELETE CASCADE NOT NULL,
    emoji text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(message_id, user_id)
);

-- ============================================
-- 7. APP SUPPORT CHAT
-- ============================================
CREATE TABLE app_support_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES app_users(id) ON DELETE CASCADE NOT NULL,
    sender_type text NOT NULL,
    content text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

-- ============================================
-- 8. LANGUAGE REQUESTS
-- ============================================
CREATE TABLE app_language_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES app_users(id) ON DELETE CASCADE NOT NULL,
    language_name text NOT NULL,
    message text,
    status text DEFAULT 'pending',
    created_at timestamp with time zone DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_app_messages_group_time ON app_messages(group_id, created_at DESC);
CREATE INDEX idx_app_messages_challenge ON app_messages(challenge_id, created_at);
CREATE INDEX idx_app_messages_sender ON app_messages(sender_id, created_at);
CREATE INDEX idx_app_group_members_user ON app_group_members(user_id);
CREATE INDEX idx_app_group_members_group ON app_group_members(group_id);
CREATE INDEX idx_app_support_user ON app_support_messages(user_id, created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_language_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on app_users" ON app_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on app_groups" ON app_groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on app_group_members" ON app_group_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on app_challenges" ON app_challenges FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on app_messages" ON app_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on app_message_reactions" ON app_message_reactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on app_support_messages" ON app_support_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on app_language_requests" ON app_language_requests FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- SEED DATA
-- ============================================
INSERT INTO app_users (id, display_name, status_text) 
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Test User',
    'Testing Language Soup! 🍲'
);

INSERT INTO app_groups (id, name, language, level, is_active, member_count)
VALUES (
    '22222222-2222-2222-2222-222222222222',
    'French #advanced',
    'French',
    'advanced',
    true,
    1
);

INSERT INTO app_group_members (user_id, group_id, role)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    'member'
);

INSERT INTO app_challenges (id, group_id, prompt_text, prompt_text_target_language, expires_at)
VALUES (
    '33333333-3333-3333-3333-333333333333',
    '22222222-2222-2222-2222-222222222222',
    'What do you associate with American Thanksgiving?',
    'qu''est-ce que tu associés avec le Thanksgiving américain ?',
    NOW() + INTERVAL '7 days'
);

-- ============================================
-- DONE!
-- ============================================
SELECT 'Setup complete! ✅' as status;
