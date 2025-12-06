-- Add learning_languages column for editable "Languages Learning" list
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'app_users' AND column_name = 'learning_languages') THEN
        ALTER TABLE app_users ADD COLUMN learning_languages TEXT[]; 
    END IF;
END $$;

-- Optional: Seed some data for the test user
UPDATE app_users 
SET learning_languages = ARRAY['Spanish', 'French']
WHERE id = 'b95021fe-ce61-4cc0-974a-8a6f6973f6f3';
