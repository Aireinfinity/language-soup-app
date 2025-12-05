-- RLS Policies for Language Soup Mobile App
-- Only for tables that actually exist in your database

-- Enable RLS on app_messages
ALTER TABLE app_messages ENABLE ROW LEVEL SECURITY;

-- app_messages policies
DROP POLICY IF EXISTS "Anyone can view messages" ON app_messages;
CREATE POLICY "Anyone can view messages"
ON app_messages FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Anyone can send messages" ON app_messages;
CREATE POLICY "Anyone can send messages"
ON app_messages FOR INSERT
WITH CHECK (true); -- Allow all for testing, tighten later with auth

-- Enable RLS on other existing tables (read-only for app)
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- groups policies (read-only)
DROP POLICY IF EXISTS "Anyone can view groups" ON groups;
CREATE POLICY "Anyone can view groups"
ON groups FOR SELECT
USING (true);

-- challenges policies (read-only)
DROP POLICY IF EXISTS "Anyone can view challenges" ON challenges;
CREATE POLICY "Anyone can view challenges"
ON challenges FOR SELECT
USING (true);

-- members policies (read-only for now)
DROP POLICY IF EXISTS "Anyone can view members" ON members;
CREATE POLICY "Anyone can view members"
ON members FOR SELECT
USING (true);
