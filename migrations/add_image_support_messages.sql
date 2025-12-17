-- Add 'image' to support messages message_type check constraint

-- Drop the existing constraint
ALTER TABLE app_support_messages 
DROP CONSTRAINT IF EXISTS app_support_messages_message_type_check;

-- Add new constraint that includes 'image'
ALTER TABLE app_support_messages
ADD CONSTRAINT app_support_messages_message_type_check 
CHECK (message_type IN ('text', 'voice', 'image'));
