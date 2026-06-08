-- community_waitlist: captures emails for the community launch notification.
-- Rollback: DROP TABLE community_waitlist;
CREATE TABLE IF NOT EXISTS community_waitlist (
  id           bigserial PRIMARY KEY,
  email        text NOT NULL,
  source       text NOT NULL DEFAULT 'community-page',
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Unique index so duplicate signups are silently ignored via ON CONFLICT DO NOTHING.
CREATE UNIQUE INDEX IF NOT EXISTS community_waitlist_email_idx ON community_waitlist (email);

ALTER TABLE community_waitlist ENABLE ROW LEVEL SECURITY;

-- Anon users may insert (the INSERT API route uses service_role, but RLS must be
-- defined on every user table per convention). No SELECT policy = anon can't read.
CREATE POLICY "service_role_only" ON community_waitlist
  USING (false)
  WITH CHECK (false);
