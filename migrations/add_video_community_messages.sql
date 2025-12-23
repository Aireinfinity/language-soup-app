-- Add video support to app_community_messages message_type constraint
ALTER TABLE app_community_messages
DROP CONSTRAINT IF EXISTS app_community_messages_message_type_check;

ALTER TABLE app_community_messages
ADD CONSTRAINT app_community_messages_message_type_check
CHECK (message_type IN ('text', 'voice', 'image', 'video', 'system', 'announcement'));
