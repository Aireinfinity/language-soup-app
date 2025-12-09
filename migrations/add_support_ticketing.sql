-- Support Dashboard Transformation: Add Ticketing System Fields
-- Adds priority, status, and public visibility tracking to support messages

-- Add new columns to support messages table
ALTER TABLE app_support_messages
ADD COLUMN IF NOT EXISTS priority TEXT CHECK (priority IN ('P0', 'P1', 'P2')),
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new' CHECK (status IN ('new', 'investigating', 'fixing', 'fixed', 'wontfix')),
ADD COLUMN IF NOT EXISTS public_visible BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN ('bug', 'feature_request', 'question')),
ADD COLUMN IF NOT EXISTS affected_user_ids UUID[],
ADD COLUMN IF NOT EXISTS fixed_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for filtering and performance
CREATE INDEX IF NOT EXISTS idx_support_priority ON app_support_messages(priority) WHERE priority IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_support_status ON app_support_messages(status);
CREATE INDEX IF NOT EXISTS idx_support_public_visible ON app_support_messages(public_visible) WHERE public_visible = true;
CREATE INDEX IF NOT EXISTS idx_support_category ON app_support_messages(category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_support_fixed_at ON app_support_messages(fixed_at DESC) WHERE fixed_at IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN app_support_messages.priority IS 'P0=urgent, P1=bugs, P2=feature requests';
COMMENT ON COLUMN app_support_messages.status IS 'Ticket lifecycle: new -> investigating -> fixing -> fixed/wontfix';
COMMENT ON COLUMN app_support_messages.public_visible IS 'Whether to show on public status page';
COMMENT ON COLUMN app_support_messages.affected_user_ids IS 'Array of user IDs who reported the same issue';
