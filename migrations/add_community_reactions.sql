-- Create app_community_reactions table for reactions on community messages
CREATE TABLE IF NOT EXISTS app_community_reactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id uuid REFERENCES app_community_messages(id) ON DELETE CASCADE,
    user_id uuid NOT NULL,
    reaction text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(message_id, user_id, reaction)
);

-- Enable RLS
ALTER TABLE app_community_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view community reactions"
ON app_community_reactions FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can add community reactions"
ON app_community_reactions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can remove their own community reactions"
ON app_community_reactions FOR DELETE
USING (auth.uid() = user_id);
