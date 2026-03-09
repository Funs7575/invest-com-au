-- Create the advisor-photos storage bucket (public so photo URLs are accessible)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'advisor-photos',
  'advisor-photos',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- RLS policy: Allow authenticated uploads via service role (API route handles auth)
-- Since advisors authenticate via custom session tokens (not Supabase Auth),
-- we use service_role for uploads through the API route.
-- Public read access for the bucket (already public=true above).

-- Allow anyone to read/download files from the bucket
CREATE POLICY "Public read access for advisor photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'advisor-photos');

-- Allow service role to insert (upload) files
CREATE POLICY "Service role can upload advisor photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'advisor-photos');

-- Allow service role to update files
CREATE POLICY "Service role can update advisor photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'advisor-photos');

-- Allow service role to delete old photos
CREATE POLICY "Service role can delete advisor photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'advisor-photos');
