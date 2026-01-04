-- Migration: Add 'notified' to support ticket status check constraint
-- Explicitly drop the constraint by name since we know it exists.

ALTER TABLE app_support_messages
DROP CONSTRAINT IF EXISTS app_support_messages_status_check;

-- Now add the updated constraint with 'notified' included
ALTER TABLE app_support_messages
ADD CONSTRAINT app_support_messages_status_check
CHECK (status IN ('new', 'investigating', 'fixing', 'fixed', 'wontfix', 'notified'));

-- Verify definition
COMMENT ON COLUMN app_support_messages.status IS 'Ticket lifecycle: new -> investigating -> fixing -> fixed/wontfix -> notified';
