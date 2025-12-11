-- ============================================
-- Preserve Messages When Users Are Deleted
-- Removes CASCADE DELETE so messages stay forever
-- ============================================

-- Step 1: Make sender_id nullable (it currently has NOT NULL constraint)
ALTER TABLE app_messages
ALTER COLUMN sender_id DROP NOT NULL;

-- Step 2: Drop the existing foreign key with CASCADE DELETE
ALTER TABLE app_messages
DROP CONSTRAINT IF EXISTS app_messages_sender_id_fkey;

-- Step 3: Re-add it with SET NULL instead (keeps message, nullifies sender)
ALTER TABLE app_messages
ADD CONSTRAINT app_messages_sender_id_fkey
FOREIGN KEY (sender_id)
REFERENCES app_users(id)
ON DELETE SET NULL;

-- Success message
SELECT 'Messages will now persist even when users are deleted! 🪦' as status;
