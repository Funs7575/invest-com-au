-- Add photo_url column to advisor_applications
ALTER TABLE advisor_applications ADD COLUMN IF NOT EXISTS photo_url TEXT;
