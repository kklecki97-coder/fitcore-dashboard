-- Add avatar_url column to coaches table
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS avatar_url text;

-- Create storage bucket for coach avatars (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('coach-avatars', 'coach-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow coaches to upload their own avatar
CREATE POLICY "coaches upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'coach-avatars' AND (storage.foldername(name))[1] = 'avatars' AND auth.uid()::text = (storage.filename(name)));

-- Allow coaches to update (overwrite) their own avatar
CREATE POLICY "coaches update own avatar"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'coach-avatars' AND (storage.foldername(name))[1] = 'avatars' AND auth.uid()::text = (storage.filename(name)));

-- Allow public read of all coach avatars
CREATE POLICY "public read coach avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'coach-avatars');
