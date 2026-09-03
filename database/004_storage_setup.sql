-- The profile setup/edit pages upload photos to a "profile-photos" storage
-- bucket, but nothing in the original project ever created that bucket or
-- its access policies — every upload was silently falling back to storing
-- raw base64 image data directly in the profiles table instead. Run this
-- once against your Supabase project.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-photos',
  'profile-photos',
  true, -- public read, so profile photos can be shown to other users
  5242880, -- 5MB, matches the client-side check in the upload handlers
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Anyone can view profile photos (they're public-facing by nature)
CREATE POLICY "profile_photos_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'profile-photos');

-- Users can only upload into a folder named after their own user id
-- (the app uploads to `${user.id}/...`), preventing one user from writing
-- into — or overwriting — another user's photos.
CREATE POLICY "profile_photos_insert_own_folder" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'profile-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "profile_photos_delete_own_folder" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'profile-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
