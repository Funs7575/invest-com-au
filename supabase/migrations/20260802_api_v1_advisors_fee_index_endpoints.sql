-- Migration: register /api/v1/advisors and /api/v1/fee-index in the API key
-- allowed_endpoints column.
--
-- Context: the allowed_endpoints column is an informational/admin ACL field.
-- The validateApiKey() flow (lib/api-auth.ts) does not enforce it at
-- request-time — it is used by the admin UI to communicate per-key grants.
-- Routes validate auth only; endpoint access is not gated on this field.
--
-- This migration:
--   1. Updates the column DEFAULT so new keys include the new endpoints.
--   2. Backfills existing active keys to include the new endpoints (opt-in
--      expansion — existing keys retain all previously granted endpoints).
--
-- Rollback strategy: revert the DEFAULT and remove the new endpoint strings
-- from existing rows with an UPDATE using array_remove().

-- 1. Update column default to include all v1 endpoints
ALTER TABLE api_keys
  ALTER COLUMN allowed_endpoints
    SET DEFAULT '{
      "/api/v1/brokers",
      "/api/v1/brokers/:slug",
      "/api/v1/compare",
      "/api/v1/advisors",
      "/api/v1/advisors/:slug",
      "/api/v1/fee-index"
    }';

-- 2. Backfill existing active keys — append new endpoints if not already present
UPDATE api_keys
SET
  allowed_endpoints = (
    SELECT array_agg(DISTINCT ep ORDER BY ep)
    FROM unnest(
      allowed_endpoints || ARRAY[
        '/api/v1/advisors',
        '/api/v1/advisors/:slug',
        '/api/v1/fee-index'
      ]
    ) AS ep
  ),
  updated_at = NOW()
WHERE is_active = true;
