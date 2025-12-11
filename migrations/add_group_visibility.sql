-- Add is_visible column to app_groups
ALTER TABLE app_groups 
ADD COLUMN is_visible boolean DEFAULT true;

-- Update existing groups to be visible
UPDATE app_groups SET is_visible = true WHERE is_visible IS NULL;

-- Notify
SELECT 'Added is_visible column to app_groups table' as status;
