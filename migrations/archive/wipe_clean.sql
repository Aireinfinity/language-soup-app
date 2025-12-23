-- DANGER: This script deletes ALL content to give a clean slate.
-- Run this in Supabase SQL Editor.

BEGIN;

-- 1. Delete all chat messages (clean chats)
DELETE FROM app_messages;

-- 2. Delete all challenges (clean challenge history)
DELETE FROM app_challenges;

-- 3. Delete all announcements (clean notice board)
DELETE FROM app_announcements;

-- 4. Delete all support tickets/messages (clean support)
DELETE FROM app_support_tickets;
DELETE FROM app_support_messages;

-- 5. Delete all native speakers (clean speaker list - optional, comment out if you want to keep them)
DELETE FROM app_native_speakers;

-- 6. Delete test users (anyone with 'demo' or 'test' in name)
-- This cascades to group memberships usually, but doing explicitly is safer
DELETE FROM app_group_members 
WHERE user_id IN (SELECT id FROM app_users WHERE display_name ILIKE '%demo%' OR display_name ILIKE '%test%');

DELETE FROM app_users 
WHERE display_name ILIKE '%demo%' OR display_name ILIKE '%test%';

-- 7. Reset member counts in groups
UPDATE app_groups g
SET member_count = (
    SELECT COUNT(DISTINCT gm.user_id)
    FROM app_group_members gm
    WHERE gm.group_id = g.id
);

COMMIT;
