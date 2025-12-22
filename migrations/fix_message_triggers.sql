-- Quick fix for message sending error
-- Run this in Supabase SQL Editor to remove old broken triggers

-- Drop any old message notification triggers
DROP TRIGGER IF EXISTS trigger_notify_new_group_message ON app_messages;
DROP TRIGGER IF EXISTS trigger_notify_new_community_message ON app_messages;
DROP FUNCTION IF EXISTS notify_new_group_message();
DROP FUNCTION IF EXISTS notify_new_community_message();

-- That's it! Message sending should work now.
