-- Fix reaction table constraints to allow multiple emojis per user per message
-- Drop the old constraint and don't add a new one since the table uses "reaction" column name
-- and our code expects "emoji" - we need to rename the columns first OR just drop constraints

-- For app_message_reactions (already exists with "emoji" column)
ALTER TABLE app_message_reactions 
DROP CONSTRAINT IF EXISTS app_message_reactions_message_id_user_id_key;

-- No need to add constraint back - we'll allow multiple reactions per user per message
