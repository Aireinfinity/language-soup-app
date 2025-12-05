-- Setup Storage Buckets for Language Soup

-- Create avatars bucket for profile pictures
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Create voice-memos bucket for voice messages
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-memos', 'voice-memos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Set up storage policies for avatars
CREATE POLICY "Public Access for Avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Users can update their own avatars"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars');

-- Set up storage policies for voice memos
CREATE POLICY "Public Access for Voice Memos"
ON storage.objects FOR SELECT
USING (bucket_id = 'voice-memos');

CREATE POLICY "Authenticated users can upload voice memos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'voice-memos');

CREATE POLICY "Users can update their own voice memos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'voice-memos');
