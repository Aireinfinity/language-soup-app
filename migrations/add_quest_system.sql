-- Quest System for Gamified Onboarding
-- Tracks user progress through 9 core app features

-- Create quest progress table
CREATE TABLE IF NOT EXISTS app_user_quests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    quest_id TEXT NOT NULL,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    seen_celebration BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one record per user per quest
    UNIQUE(user_id, quest_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_quests_user_id ON app_user_quests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_quests_quest_id ON app_user_quests(quest_id);

-- Enable RLS
ALTER TABLE app_user_quests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own quests
CREATE POLICY "Users can view own quests"
    ON app_user_quests
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own quests
CREATE POLICY "Users can insert own quests"
    ON app_user_quests
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own quests
CREATE POLICY "Users can update own quests"
    ON app_user_quests
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Function to get user's quest progress
CREATE OR REPLACE FUNCTION get_user_quest_progress(uid UUID)
RETURNS TABLE (
    quest_id TEXT,
    completed BOOLEAN,
    completed_at TIMESTAMPTZ,
    seen_celebration BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        q.quest_id,
        TRUE as completed,
        q.completed_at,
        q.seen_celebration
    FROM app_user_quests q
    WHERE q.user_id = uid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to complete a quest
CREATE OR REPLACE FUNCTION complete_quest(
    uid UUID,
    qid TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    quest_exists BOOLEAN;
BEGIN
    -- Check if quest already completed
    SELECT EXISTS(
        SELECT 1 FROM app_user_quests 
        WHERE user_id = uid AND quest_id = qid
    ) INTO quest_exists;
    
    -- If not completed, insert it
    IF NOT quest_exists THEN
        INSERT INTO app_user_quests (user_id, quest_id, completed_at, seen_celebration)
        VALUES (uid, qid, NOW(), FALSE);
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark celebration as seen
CREATE OR REPLACE FUNCTION mark_celebration_seen(
    uid UUID,
    qid TEXT
)
RETURNS VOID AS $$
BEGIN
    UPDATE app_user_quests
    SET seen_celebration = TRUE
    WHERE user_id = uid AND quest_id = qid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable realtime for quest updates
ALTER PUBLICATION supabase_realtime ADD TABLE app_user_quests;
