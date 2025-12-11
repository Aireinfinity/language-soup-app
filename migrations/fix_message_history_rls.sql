-- ============================================
-- Fix Chat History RLS Policy
-- Ensures ALL group members can see ALL messages in their groups
-- ============================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view messages in their groups" ON app_messages;
DROP POLICY IF EXISTS "Users can view group messages" ON app_messages;

-- Create new policy: ALL messages visible to group members (no date restrictions!)
CREATE POLICY "Group members see all messages"
ON app_messages
FOR SELECT
USING (
    -- If you're in the group, you see EVERYTHING
    group_id IN (
        SELECT group_id FROM app_group_members
        WHERE user_id = auth.uid()
    )
);

-- Success message
SELECT 'Chat history RLS policy updated! All group members can now see full history. ✅' as status;
