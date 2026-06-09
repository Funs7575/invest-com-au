-- ============================================================================
-- Migration: 20260309_create_advisor_photos_storage.sql
-- Purpose: Create the public 'advisor-photos' storage bucket (5MB limit,
--          jpeg/png/webp only) and four storage.objects RLS policies
--          (public read; service-role insert / update / delete).
-- Rollback: DROP the four policies, then DELETE the bucket. DESTRUCTIVE
--          on bucket DELETE — every uploaded advisor photo file is
--          orphaned (or removed if the bucket is force-emptied first).
-- Risk: high (irreversible) — reverse drops all uploaded advisor portrait
--       images and breaks the rendered photo_url on every advisor profile.
--       Recovery requires restoring the bucket from a Supabase storage
--       backup; the migration cannot recreate the binary contents.
-- ============================================================================
--
-- Forward operations:
--   1. INSERT INTO storage.buckets (id, name, public, file_size_limit,
--      allowed_mime_types) VALUES ('advisor-photos', ..., true, 5242880,
--      ARRAY['image/jpeg','image/png','image/webp']).
--   2. CREATE POLICY "Public read access for advisor photos" ON storage.objects
--      FOR SELECT USING (bucket_id = 'advisor-photos').
--   3. CREATE POLICY "Service role can upload advisor photos" ON storage.objects
--      FOR INSERT WITH CHECK (bucket_id = 'advisor-photos').
--   4. CREATE POLICY "Service role can update advisor photos" ON storage.objects
--      FOR UPDATE USING (bucket_id = 'advisor-photos').
--   5. CREATE POLICY "Service role can delete advisor photos" ON storage.objects
--      FOR DELETE USING (bucket_id = 'advisor-photos').
--
-- Rollback (in reverse order):
--   -- Pre-step (operator): back up bucket contents externally if photos
--   -- need to be preserved. The DELETE in step 1 fails while objects
--   -- exist; operator must empty the bucket first via Supabase dashboard
--   -- or `supabase storage rm`.
--   5. DROP POLICY IF EXISTS "Service role can delete advisor photos"
--        ON storage.objects;
--   4. DROP POLICY IF EXISTS "Service role can update advisor photos"
--        ON storage.objects;
--   3. DROP POLICY IF EXISTS "Service role can upload advisor photos"
--        ON storage.objects;
--   2. DROP POLICY IF EXISTS "Public read access for advisor photos"
--        ON storage.objects;
--   1. DELETE FROM storage.buckets WHERE id = 'advisor-photos';
--      -- DESTRUCTIVE: every uploaded advisor portrait is unreachable;
--      -- /advisors/[slug] photo_url renders fall back to placeholder.
-- ============================================================================

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
