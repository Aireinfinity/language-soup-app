-- Message Reactions Table
CREATE TABLE IF NOT EXISTS app_message_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES app_messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON app_message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON app_message_reactions(user_id);

-- Enable RLS
ALTER TABLE app_message_reactions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view all reactions"
  ON app_message_reactions FOR SELECT
  USING (true);

CREATE POLICY "Users can add their own reactions"
  ON app_message_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions"
  ON app_message_reactions FOR DELETE
  USING (auth.uid() = user_id);
