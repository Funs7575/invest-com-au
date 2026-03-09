-- Admin login rate limiting table (replaces in-memory Map)
CREATE TABLE IF NOT EXISTS admin_login_attempts (
  ip_hash TEXT PRIMARY KEY,
  count INT NOT NULL DEFAULT 1,
  reset_at TIMESTAMPTZ NOT NULL
);

-- Auto-cleanup: delete expired entries periodically
CREATE INDEX idx_admin_login_attempts_reset_at ON admin_login_attempts (reset_at);

-- RLS: only service role can access this table
ALTER TABLE admin_login_attempts ENABLE ROW LEVEL SECURITY;
-- No RLS policies = only service role key can read/write
