-- Create app_support_reactions table for reactions on support messages
CREATE TABLE IF NOT EXISTS app_support_reactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id uuid REFERENCES app_support_messages(id) ON DELETE CASCADE,
    user_id uuid NOT NULL,
    reaction text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(message_id, user_id, reaction)
);

-- Enable RLS
ALTER TABLE app_support_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view support reactions"
ON app_support_reactions FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can add support reactions"
ON app_support_reactions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can remove their own support reactions"
ON app_support_reactions FOR DELETE
USING (auth.uid() = user_id);
