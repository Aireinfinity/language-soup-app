-- Fix Support Ticket Categories
-- The problem: Database constraint 'app_support_messages_category_check' is rejecting the category value
-- The fix: Drop the strict check and re-add it with all used values

-- 1. Drop the existing restriction
ALTER TABLE app_support_messages
DROP CONSTRAINT IF EXISTS app_support_messages_category_check;

-- 2. Add the correct restriction that matches our code
ALTER TABLE app_support_messages
ADD CONSTRAINT app_support_messages_category_check 
CHECK (category IN ('bug', 'feature_request', 'question', 'feature'));

-- Note: Added 'feature' just in case old data exists or code reverts
