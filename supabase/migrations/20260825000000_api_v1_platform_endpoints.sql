-- Migration: register new v1 endpoints in the API key allowed_endpoints column.
--
-- New endpoints added in this migration:
--   /api/v1/savings             — savings account + term deposit list
--   /api/v1/savings/:slug       — single savings platform detail
--   /api/v1/robo-advisors       — robo-advisor list
--   /api/v1/robo-advisors/:slug — single robo-advisor detail
--   /api/v1/health-scores       — current broker health scores
--   /api/v1/health-scores/history — health score time-series
--   /api/v1/openapi.json        — OpenAPI 3.1 spec (public, but registered for completeness)
--
-- Context: the allowed_endpoints column is an informational/admin ACL field.
-- The validateApiKey() flow (lib/api-auth.ts) does not enforce it at
-- request-time — it is used by the admin UI to communicate per-key grants.
--
-- This migration:
--   1. Updates the column DEFAULT so new keys include all new endpoints.
--   2. Backfills existing active keys (opt-in expansion — no endpoint is removed).
--
-- Rollback strategy:
--   ALTER TABLE api_keys ALTER COLUMN allowed_endpoints SET DEFAULT '{...previous...}';
--   UPDATE api_keys SET allowed_endpoints = array_remove(allowed_endpoints, '/api/v1/savings'), ...;

-- 1. Update column default to include all v1 endpoints
ALTER TABLE api_keys
  ALTER COLUMN allowed_endpoints
    SET DEFAULT '{
      "/api/v1/brokers",
      "/api/v1/brokers/:slug",
      "/api/v1/compare",
      "/api/v1/advisors",
      "/api/v1/advisors/:slug",
      "/api/v1/fee-index",
      "/api/v1/savings",
      "/api/v1/savings/:slug",
      "/api/v1/robo-advisors",
      "/api/v1/robo-advisors/:slug",
      "/api/v1/health-scores",
      "/api/v1/health-scores/history",
      "/api/v1/openapi.json"
    }';

-- 2. Backfill existing active keys — append new endpoints if not already present
UPDATE api_keys
SET
  allowed_endpoints = (
    SELECT array_agg(DISTINCT ep ORDER BY ep)
    FROM unnest(
      allowed_endpoints || ARRAY[
        '/api/v1/savings',
        '/api/v1/savings/:slug',
        '/api/v1/robo-advisors',
        '/api/v1/robo-advisors/:slug',
        '/api/v1/health-scores',
        '/api/v1/health-scores/history',
        '/api/v1/openapi.json'
      ]
    ) AS ep
  ),
  updated_at = NOW()
WHERE is_active = true;
