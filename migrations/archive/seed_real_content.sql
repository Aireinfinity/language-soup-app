-- ============================================
-- USER SPECIFIED GROUP SEED DATA
-- ============================================

-- 1. Clean Slate
DELETE FROM app_group_members;
DELETE FROM app_challenges;
DELETE FROM app_groups;
-- Note: Keeping users to avoid breaking auth, but ensuring Chef exists

-- 2. Ensure Chef User Exists
INSERT INTO app_users (id, display_name, status_text, avatar_url)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    'Soup Chef 👨‍🍳',
    'Cooking up daily challenges!',
    'https://api.dicebear.com/7.x/avataaars/png?seed=Chef'
) ON CONFLICT (id) DO NOTHING;

-- 3. Insert ACTIVE Groups
INSERT INTO app_groups (name, language, level, is_active, member_count, description) VALUES
('french #intermediate', 'French', 'intermediate', true, 12, 'Intermediate French practice.'),
('french #beginner', 'French', 'beginner', true, 24, 'Start your French journey here.'),
('french #advanced', 'French', 'advanced', true, 8, 'Advanced discussions in French.'),
('german', 'German', 'all', true, 15, 'Guten Tag! German practice for all levels.'),
('spanish #advanced', 'Spanish', 'advanced', true, 10, 'Advanced Spanish conversation.'),
('spanish #intermediate', 'Spanish', 'intermediate', true, 1, 'New group! Intermediate Spanish practice.'),
('italian', 'Italian', 'all', true, 18, 'Ciao! Italian language soup.'),
('portuguese', 'Portuguese', 'all', true, 14, 'Olá! Portuguese community.'),
('tagalog', 'Tagalog', 'all', true, 9, 'Kamusta! Tagalog language group.'),
('hungarian', 'Hungarian', 'all', true, 5, 'Szia! Hungarian practice.');

-- 4. Insert INACTIVE Groups
INSERT INTO app_groups (name, language, level, is_active, member_count, description) VALUES
('yoruba', 'Yoruba', 'all', false, 0, 'Yoruba language group (Inactive).'),
('swedish', 'Swedish', 'all', false, 0, 'Swedish language group (Inactive).'),
('mandarin', 'Mandarin', 'all', false, 0, 'Mandarin language group (Inactive).'),
('farsi', 'Farsi', 'all', false, 0, 'Farsi language group (Inactive).'),
('dutch', 'Dutch', 'all', false, 0, 'Dutch language group (Inactive).');

-- 5. Create Initial Challenges for ACTIVE Groups
-- We'll add a generic welcome challenge to all active groups so they aren't empty.

INSERT INTO app_challenges (group_id, prompt_text, prompt_text_target_language, expires_at)
SELECT id, 'Welcome! Introduce yourself and say why you are learning this language.', 'Bienvenue! / ¡Hola! / Hello!', NOW() + INTERVAL '7 days'
FROM app_groups
WHERE is_active = true;

SELECT 'User groups seeded successfully! 🍲' as status;
