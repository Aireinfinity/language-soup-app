-- Add role support for admin and community manager access
-- Add new fields for profile wrapped card

-- Add role column to app_users
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'community_manager', 'admin'));

-- Add profile fields for wrapped card
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS fluent_languages TEXT[];
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS learning_languages TEXT[];
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS ethnicity_flags TEXT[];

-- Create community managers table for group assignments
CREATE TABLE IF NOT EXISTS app_community_managers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
    group_id UUID REFERENCES app_groups(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, group_id)
);

-- Create announcements table
CREATE TABLE IF NOT EXISTS app_announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID REFERENCES app_users(id),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE app_community_managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_announcements ENABLE ROW LEVEL SECURITY;

-- Policies for community managers table
CREATE POLICY "Users can view their own manager assignments" ON app_community_managers
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all assignments" ON app_community_managers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM app_users WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Policies for announcements
CREATE POLICY "Everyone can view announcements" ON app_announcements
    FOR SELECT USING (true);

CREATE POLICY "Admins can create announcements" ON app_announcements
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM app_users WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Set Noah as admin (replace with actual user ID)
-- UPDATE app_users SET role = 'admin' WHERE email = 'noah@languagesoup.com';

-- Set community managers (Eva, Johnny, Olivia, Eryn)
-- UPDATE app_users SET role = 'community_manager' WHERE display_name IN ('Eva', 'Johnny', 'Olivia', 'Eryn');

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_community_managers_user ON app_community_managers(user_id);
CREATE INDEX IF NOT EXISTS idx_community_managers_group ON app_community_managers(group_id);
CREATE INDEX IF NOT EXISTS idx_announcements_created ON app_announcements(created_at DESC);
