-- Create app_message_reactions table
CREATE TABLE IF NOT EXISTS app_message_reactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id uuid REFERENCES app_messages(id) ON DELETE CASCADE,
    user_id uuid NOT NULL, -- auth.uid()
    reaction text NOT NULL, -- emoji char
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(message_id, user_id, reaction)
);

-- Enable RLS
ALTER TABLE app_message_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view reactions"
ON app_message_reactions FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can add reactions"
ON app_message_reactions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can remove their own reactions"
ON app_message_reactions FOR DELETE
USING (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000000'); -- Allow test user deletion if needed
