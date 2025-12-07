-- Community Chat Feature
-- Tables for global community messaging

-- 1. Community Messages Table
CREATE TABLE IF NOT EXISTS app_community_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'text', -- text, image, etc.
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Community Announcements Table (pinned messages from admins)
CREATE TABLE IF NOT EXISTS app_community_announcements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- 3. Enable RLS
ALTER TABLE app_community_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_community_announcements ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for Community Messages
-- Everyone can read community messages
CREATE POLICY "Anyone can read community messages"
ON app_community_messages FOR SELECT
TO authenticated
USING (true);

-- Users can send messages
CREATE POLICY "Users can send community messages"
ON app_community_messages FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 5. RLS Policies for Announcements
-- Everyone can read announcements
CREATE POLICY "Anyone can read announcements"
ON app_community_announcements FOR SELECT
TO authenticated
USING (true);

-- Only admins can create announcements
CREATE POLICY "Admins can create announcements"
ON app_community_announcements FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
    SELECT 1 FROM app_users 
    WHERE id = auth.uid() AND is_admin = true
));

-- Only admins can update announcements
CREATE POLICY "Admins can update announcements"
ON app_community_announcements FOR UPDATE
TO authenticated
USING (EXISTS (
    SELECT 1 FROM app_users 
    WHERE id = auth.uid() AND is_admin = true
));

-- 6. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_community_messages_created 
ON app_community_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_announcements_active 
ON app_community_announcements(active, created_at DESC);

-- 7. Enable realtime for community messages
ALTER PUBLICATION supabase_realtime ADD TABLE app_community_messages;

-- 8. Insert sample announcement (Week 4 Update)
INSERT INTO app_community_announcements (content, active) VALUES (
    '🍜 week 4 update!

🔥 this week''s most active groups: french #advanced, french #intermediate, french #beginner okay my oui oui people pop off!

📣 keep inviting your friends!

💬 new groups that need members! jump in and help these newer languages grow!
• Spanish #intermediate (3 members)
• Swedish (3 members)
• mandarin (3 members)
• yoruba (3 members)
• farsi (3 members)
• dutch (3 members)
• spanish #beginner (5 members)
• danish (6 members)
just click the group name to join or add someone you know who''s learning that lang! 

🙀 language soup app is coming soon! am i a coder? no! am i still making it? yes! i need some really eager beaver testers who want to help work out all the bugs in the app before we go live to the whole group so text me directly if you are interested! power users & community admins i will be texting you for feedback / testing timeline!

✨ shoutout to our newest community manager! eryn is managing the tagalog group! woohoo!

👥 got questions? im just a text away and am free 24/7 mwahaha

📸 follow along: @languagesoup

keep speaking 💪🏽',
    true
);
