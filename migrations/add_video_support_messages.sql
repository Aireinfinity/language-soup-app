-- Add video support to app_support_messages message_type constraint
ALTER TABLE app_support_messages
DROP CONSTRAINT IF EXISTS app_support_messages_message_type_check;

ALTER TABLE app_support_messages
ADD CONSTRAINT app_support_messages_message_type_check
CHECK (message_type IN ('text', 'voice', 'image', 'video', 'system'));
