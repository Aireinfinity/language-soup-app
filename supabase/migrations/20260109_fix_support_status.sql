-- Fix Support Status Constraint
-- User wants to use 'resolved' and 'notified' which are currently rejected by the CHECK constraint.

ALTER TABLE app_support_messages
DROP CONSTRAINT IF EXISTS app_support_messages_status_check;

ALTER TABLE app_support_messages
ADD CONSTRAINT app_support_messages_status_check 
CHECK (status IN ('new', 'investigating', 'fixing', 'fixed', 'wontfix', 'resolved', 'notified'));
