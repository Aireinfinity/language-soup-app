-- ============================================
-- SEED DATA ONLY (tables already exist)
-- ============================================

-- Clear existing seed data first
DELETE FROM app_group_members WHERE user_id = '11111111-1111-1111-1111-111111111111';
DELETE FROM app_challenges WHERE id = '33333333-3333-3333-3333-333333333333';
DELETE FROM app_groups WHERE id = '22222222-2222-2222-2222-222222222222';
DELETE FROM app_users WHERE id = '11111111-1111-1111-1111-111111111111';

-- Test user
INSERT INTO app_users (id, display_name, status_text) 
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Test User',
    'Testing Language Soup! 🍲'
);

-- French #advanced group
INSERT INTO app_groups (id, name, language, level, is_active, member_count)
VALUES (
    '22222222-2222-2222-2222-222222222222',
    'French #advanced',
    'French',
    'advanced',
    true,
    1
);

-- Add test user to French group
INSERT INTO app_group_members (user_id, group_id, role)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    'member'
);

-- Test challenge
INSERT INTO app_challenges (id, group_id, prompt_text, prompt_text_target_language, expires_at)
VALUES (
    '33333333-3333-3333-3333-333333333333',
    '22222222-2222-2222-2222-222222222222',
    'What do you associate with American Thanksgiving?',
    'qu''est-ce que tu associés avec le Thanksgiving américain ?',
    NOW() + INTERVAL '7 days'
);

SELECT 'Seed data inserted! ✅' as status;
