-- widget_licenses: stores white-label embed license tokens for the
-- /api/widget/licensed route. Each row corresponds to one license token
-- issued to a Pro/Enterprise API key holder.
--
-- Rollback: DROP TABLE IF EXISTS widget_licenses;
--
-- Security model: RLS enabled, service_role only. The token is stored as a
-- SHA-256 hash (token_hash) so a DB breach does not reveal plaintext tokens.
-- The first 12 characters are kept as token_prefix for identification without
-- exposing the full token.
--
-- The licensed widget route (/api/widget/licensed) looks up by token_hash
-- and checks is_active before removing the "Powered by" attribution footer.

CREATE TABLE IF NOT EXISTS widget_licenses (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id      uuid        NOT NULL,
  name            text        NOT NULL DEFAULT '',
  token_hash      text        NOT NULL UNIQUE,
  token_prefix    text        NOT NULL,
  allowed_domains text[]      NOT NULL DEFAULT '{}',
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT widget_licenses_name_len   CHECK (char_length(name) <= 128),
  CONSTRAINT widget_licenses_prefix_len CHECK (char_length(token_prefix) <= 20)
);

CREATE INDEX IF NOT EXISTS idx_widget_licenses_api_key
  ON widget_licenses(api_key_id);

CREATE INDEX IF NOT EXISTS idx_widget_licenses_token_hash
  ON widget_licenses(token_hash)
  WHERE is_active = true;

ALTER TABLE widget_licenses ENABLE ROW LEVEL SECURITY;

-- Service-role only: no direct client access
CREATE POLICY "widget_licenses_service_only"
  ON widget_licenses
  USING (false);
