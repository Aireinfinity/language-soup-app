-- Add video support to app_messages message_type constraint (group chat)
ALTER TABLE app_messages
DROP CONSTRAINT IF EXISTS app_messages_message_type_check;

ALTER TABLE app_messages
ADD CONSTRAINT app_messages_message_type_check
CHECK (message_type IN ('text', 'voice', 'image', 'video', 'system'));
