-- ============================================
-- Simple delete - just remove app data
-- Auth sessions will remain but won't matter
-- ============================================

-- Delete all app users (cascades to group_members, etc.)
DELETE FROM app_users;

-- Success
SELECT 'All app users deleted! Restart the app to be logged out. 🔄' as status;
