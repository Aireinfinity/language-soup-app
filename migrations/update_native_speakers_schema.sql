-- Add missing columns to app_native_speakers table

-- Add availability as a simple text field (easier than complex scheduling)
ALTER TABLE app_native_speakers 
ADD COLUMN IF NOT EXISTS availability TEXT;

-- Add whatsapp_number as alias/addition to contact_whatsapp
ALTER TABLE app_native_speakers 
ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;

-- Add photo_url as alias for avatar_url
ALTER TABLE app_native_speakers 
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Update existing records to sync contact_whatsapp to whatsapp_number
UPDATE app_native_speakers 
SET whatsapp_number = contact_whatsapp 
WHERE contact_whatsapp IS NOT NULL AND whatsapp_number IS NULL;

-- Update existing records to sync avatar_url to photo_url
UPDATE app_native_speakers 
SET photo_url = avatar_url 
WHERE avatar_url IS NOT NULL AND photo_url IS NULL;

-- Add RLS policy to allow users to insert themselves as native speakers
DROP POLICY IF EXISTS "Users can add themselves as speakers" ON app_native_speakers;
CREATE POLICY "Users can add themselves as speakers"
ON app_native_speakers FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add RLS policy to allow users to update their own speaker profile
DROP POLICY IF EXISTS "Users can update their own speaker profile" ON app_native_speakers;
CREATE POLICY "Users can update their own speaker profile"
ON app_native_speakers FOR UPDATE
USING (auth.uid() = user_id);
