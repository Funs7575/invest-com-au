-- PR 9.2: Investment clubs — information-sharing groups for investors.
--
-- Compliance note: clubs are information-sharing only. No pooled money,
-- no custody, no investment advice. All views carry the GENERAL_ADVICE_WARNING.
--
-- Tables:
--   investment_clubs      — club entity (name, slug, invite-only by default)
--   club_members          — membership with anonymised display_name for benchmarking
--   club_watchlist_items  — shared list of brokers the group is watching
--   club_messages         — in-club discussion
--   club_invitations      — invite tokens (7-day expiry, single-use)
--
-- Rollback:
--   DROP TABLE IF EXISTS public.club_invitations CASCADE;
--   DROP TABLE IF EXISTS public.club_messages CASCADE;
--   DROP TABLE IF EXISTS public.club_watchlist_items CASCADE;
--   DROP TABLE IF EXISTS public.club_members CASCADE;
--   DROP TABLE IF EXISTS public.investment_clubs CASCADE;

-- ── investment_clubs ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.investment_clubs (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text        NOT NULL CHECK (char_length(name) BETWEEN 2 AND 60),
  slug         text        NOT NULL UNIQUE,
  description  text        CHECK (description IS NULL OR char_length(description) <= 500),
  created_by   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_limit integer     NOT NULL DEFAULT 20
                           CHECK (member_limit BETWEEN 2 AND 50),
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.investment_clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_clubs FORCE ROW LEVEL SECURITY;

-- NOTE: the "club_members_read_club" SELECT policy on investment_clubs
-- subqueries club_members, so it is created further down — after the
-- club_members table exists.

-- Authenticated users can create clubs
CREATE POLICY "authenticated_insert_club"
  ON public.investment_clubs FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Owner can update/delete their club
CREATE POLICY "owner_manage_club"
  ON public.investment_clubs FOR ALL
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "service_role_clubs"
  ON public.investment_clubs FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS investment_clubs_created_by_idx
  ON public.investment_clubs (created_by, created_at DESC);

-- ── club_members ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.club_members (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id      uuid        NOT NULL REFERENCES public.investment_clubs(id) ON DELETE CASCADE,
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role         text        NOT NULL DEFAULT 'member'
                           CHECK (role IN ('owner', 'member')),
  display_name text        NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 40),
  joined_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (club_id, user_id)
);

ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_members FORCE ROW LEVEL SECURITY;

-- Members can see other members of their clubs
CREATE POLICY "club_members_read_members"
  ON public.club_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.club_members cm2
      WHERE cm2.club_id = club_members.club_id
        AND cm2.user_id = auth.uid()
    )
  );

-- Inserts handled by server (join flow)
CREATE POLICY "service_role_members"
  ON public.club_members FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS club_members_club_idx
  ON public.club_members (club_id, joined_at DESC);

CREATE INDEX IF NOT EXISTS club_members_user_idx
  ON public.club_members (user_id);

-- Members can read their clubs (joined via club_members).
-- Defined here (not in the investment_clubs section above) because it
-- subqueries club_members, which must exist first.
CREATE POLICY "club_members_read_club"
  ON public.investment_clubs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_members.club_id = investment_clubs.id
        AND club_members.user_id = auth.uid()
    )
  );

-- ── club_watchlist_items ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.club_watchlist_items (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id             uuid        NOT NULL REFERENCES public.investment_clubs(id) ON DELETE CASCADE,
  added_by_member_id  uuid        NOT NULL REFERENCES public.club_members(id) ON DELETE CASCADE,
  broker_id           integer     NOT NULL REFERENCES public.brokers(id) ON DELETE CASCADE,
  notes               text        CHECK (notes IS NULL OR char_length(notes) <= 300),
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (club_id, broker_id)
);

ALTER TABLE public.club_watchlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_watchlist_items FORCE ROW LEVEL SECURITY;

CREATE POLICY "club_members_read_watchlist"
  ON public.club_watchlist_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_members.club_id = club_watchlist_items.club_id
        AND club_members.user_id = auth.uid()
    )
  );

CREATE POLICY "club_members_manage_watchlist"
  ON public.club_watchlist_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_members.id = added_by_member_id
        AND club_members.user_id = auth.uid()
    )
  );

CREATE POLICY "service_role_watchlist"
  ON public.club_watchlist_items FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS club_watchlist_club_idx
  ON public.club_watchlist_items (club_id, created_at DESC);

-- ── club_messages ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.club_messages (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id           uuid        NOT NULL REFERENCES public.investment_clubs(id) ON DELETE CASCADE,
  author_member_id  uuid        NOT NULL REFERENCES public.club_members(id) ON DELETE CASCADE,
  body              text        NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.club_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_messages FORCE ROW LEVEL SECURITY;

CREATE POLICY "club_members_read_messages"
  ON public.club_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_members.club_id = club_messages.club_id
        AND club_members.user_id = auth.uid()
    )
  );

CREATE POLICY "club_members_send_messages"
  ON public.club_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_members.id = author_member_id
        AND club_members.user_id = auth.uid()
    )
  );

CREATE POLICY "service_role_messages"
  ON public.club_messages FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS club_messages_club_idx
  ON public.club_messages (club_id, created_at DESC);

-- ── club_invitations ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.club_invitations (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id              uuid        NOT NULL REFERENCES public.investment_clubs(id) ON DELETE CASCADE,
  invited_by_user_id   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_token         text        NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  expires_at           timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  used_at              timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.club_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_invitations FORCE ROW LEVEL SECURITY;

-- Club members can read their club's invitations
CREATE POLICY "club_members_read_invitations"
  ON public.club_invitations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_members.club_id = club_invitations.club_id
        AND club_members.user_id = auth.uid()
    )
  );

-- Club members can create invitations
CREATE POLICY "club_members_create_invitations"
  ON public.club_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    invited_by_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_members.club_id = club_invitations.club_id
        AND club_members.user_id = auth.uid()
    )
  );

CREATE POLICY "service_role_invitations"
  ON public.club_invitations FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS club_invitations_token_idx
  ON public.club_invitations (invite_token);

CREATE INDEX IF NOT EXISTS club_invitations_club_idx
  ON public.club_invitations (club_id, created_at DESC);
