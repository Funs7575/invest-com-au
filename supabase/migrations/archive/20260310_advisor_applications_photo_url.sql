-- ============================================================================
-- Migration: 20260310_advisor_applications_photo_url.sql
-- Purpose: Add photo_url column to advisor_applications.
-- Rollback: ALTER TABLE advisor_applications DROP COLUMN IF EXISTS photo_url;
-- Risk: low — additive, single nullable text column.
-- ============================================================================
--
-- Forward operations:
--   1. ALTER TABLE advisor_applications ADD COLUMN IF NOT EXISTS photo_url TEXT;
--
-- Rollback (in reverse order):
--   1. ALTER TABLE advisor_applications DROP COLUMN IF EXISTS photo_url;
--

ALTER TABLE advisor_applications ADD COLUMN IF NOT EXISTS photo_url TEXT;
