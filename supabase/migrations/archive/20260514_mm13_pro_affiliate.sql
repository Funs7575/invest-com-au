-- ============================================================================
-- Migration: 20260514_mm13_pro_affiliate.sql
-- Purpose: Pro affiliate program — verified pros (individuals + expert_teams)
--          get personal landing-page share links they can post on LinkedIn,
--          drive traffic into Get Matched, and earn credit rewards when their
--          attributed audience signs up, posts a brief, or has a brief
--          accepted. Introduces 3 tables:
--            - pro_affiliate_links     (one row per (pro_slug, pro_kind))
--            - pro_affiliate_clicks    (raw click log, FK to links)
--            - pro_affiliate_credits   (credit-award ledger)
--
-- Idempotency: every CREATE uses IF NOT EXISTS; every POLICY/INDEX is
-- DROP-then-CREATE. Safe to re-apply.
--
-- Rollback (destructive, reverse order):
--   DROP TABLE IF EXISTS public.pro_affiliate_credits;
--   DROP TABLE IF EXISTS public.pro_affiliate_clicks;
--   DROP TABLE IF EXISTS public.pro_affiliate_links;
--   -- Destroys the credit-award ledger + click log + share-token registry.
--   -- Anyone with a live shared LinkedIn post pointing at /p/<token> will
--   -- 404 after rollback. Coordinate with marketing.
--
-- Risk: low — additive only, no existing column touches. Tables hold
-- attribution data (linkable to individuals via attributed_user_id /
-- ip_hash). RLS denies anon read on all three; authenticated pros can
-- only see their own credit rows; service_role full access for the
-- server-side track/award helpers in lib/pro-affiliate/.
-- ============================================================================

BEGIN;

-- ── 1. pro_affiliate_links ────────────────────────────────────────────────
-- One row per (pro_slug, pro_kind). `pro_slug` references either
-- `professionals.slug` (when pro_kind='professional') or
-- `expert_teams.slug` (when pro_kind='team'). FK-less by design — slug
-- changes on either side would require a coordinated rename and the
-- table's role is share-link registry, not referential authority.
CREATE TABLE IF NOT EXISTS public.pro_affiliate_links (
  id               bigserial PRIMARY KEY,
  pro_slug         text NOT NULL,
  pro_kind         text NOT NULL CHECK (pro_kind IN ('professional', 'team')),
  share_token      text NOT NULL UNIQUE,
  created_at       timestamptz NOT NULL DEFAULT now(),
  last_clicked_at  timestamptz,
  click_count      integer NOT NULL DEFAULT 0,
  signup_count     integer NOT NULL DEFAULT 0,
  brief_count      integer NOT NULL DEFAULT 0,
  UNIQUE (pro_slug, pro_kind)
);

CREATE INDEX IF NOT EXISTS idx_pro_affiliate_links_token
  ON public.pro_affiliate_links (share_token);
CREATE INDEX IF NOT EXISTS idx_pro_affiliate_links_pro
  ON public.pro_affiliate_links (pro_slug, pro_kind);

ALTER TABLE public.pro_affiliate_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access pro_affiliate_links"
  ON public.pro_affiliate_links;
CREATE POLICY "Service role full access pro_affiliate_links"
  ON public.pro_affiliate_links FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated pros may read their own link row (individual or team
-- membership). Anon SELECT denied by absence of policy.
DROP POLICY IF EXISTS "Pros can read their own affiliate link"
  ON public.pro_affiliate_links;
CREATE POLICY "Pros can read their own affiliate link"
  ON public.pro_affiliate_links FOR SELECT
  TO authenticated
  USING (
    (pro_kind = 'professional' AND pro_slug IN (
      SELECT slug FROM public.professionals
      WHERE auth_user_id = auth.uid()
    ))
    OR
    (pro_kind = 'team' AND pro_slug IN (
      SELECT t.slug
      FROM public.expert_teams t
      JOIN public.expert_team_members tm ON tm.team_id = t.id
      JOIN public.professionals p       ON p.id = tm.professional_id
      WHERE p.auth_user_id = auth.uid()
        AND tm.status = 'active'
    ))
  );

-- ── 2. pro_affiliate_clicks ───────────────────────────────────────────────
-- Click-log; one row per landing visit. session_id is the client-side
-- cookie/local-storage handle so we can attribute a later signup.
-- attributed_user_id is set when the signup hook can resolve the
-- session_id → auth user.
CREATE TABLE IF NOT EXISTS public.pro_affiliate_clicks (
  id                   bigserial PRIMARY KEY,
  share_token          text NOT NULL REFERENCES public.pro_affiliate_links(share_token) ON DELETE CASCADE,
  session_id           text,
  ip_hash              text,
  user_agent           text,
  landing_page         text,
  clicked_at           timestamptz NOT NULL DEFAULT now(),
  attributed_user_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_pro_affiliate_clicks_token_time
  ON public.pro_affiliate_clicks (share_token, clicked_at DESC);
CREATE INDEX IF NOT EXISTS idx_pro_affiliate_clicks_session
  ON public.pro_affiliate_clicks (session_id, clicked_at DESC)
  WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pro_affiliate_clicks_attributed_user
  ON public.pro_affiliate_clicks (attributed_user_id)
  WHERE attributed_user_id IS NOT NULL;

ALTER TABLE public.pro_affiliate_clicks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access pro_affiliate_clicks"
  ON public.pro_affiliate_clicks;
CREATE POLICY "Service role full access pro_affiliate_clicks"
  ON public.pro_affiliate_clicks FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
-- No anon / authenticated read — raw click data stays server-only.

-- ── 3. pro_affiliate_credits ──────────────────────────────────────────────
-- Credit-award ledger. One row per awardable event (signup,
-- brief_created, brief_accepted). Future admin tooling reads this to
-- pay out credit grants into advisor_credit_ledger.
CREATE TABLE IF NOT EXISTS public.pro_affiliate_credits (
  id                    bigserial PRIMARY KEY,
  pro_slug              text NOT NULL,
  pro_kind              text NOT NULL CHECK (pro_kind IN ('professional', 'team')),
  source_event          text NOT NULL CHECK (source_event IN ('signup', 'brief_created', 'brief_accepted')),
  credits_awarded       integer NOT NULL CHECK (credits_awarded >= 0),
  attributed_brief_id   integer REFERENCES public.advisor_auctions(id) ON DELETE SET NULL,
  attributed_user_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pro_affiliate_credits_pro_time
  ON public.pro_affiliate_credits (pro_slug, pro_kind, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pro_affiliate_credits_event
  ON public.pro_affiliate_credits (source_event, created_at DESC);

ALTER TABLE public.pro_affiliate_credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access pro_affiliate_credits"
  ON public.pro_affiliate_credits;
CREATE POLICY "Service role full access pro_affiliate_credits"
  ON public.pro_affiliate_credits FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated pros may read their own credit rows. Individual pros
-- match via professionals.auth_user_id; team rows match via active
-- expert_team_members membership.
DROP POLICY IF EXISTS "Pros can read their own credit rows"
  ON public.pro_affiliate_credits;
CREATE POLICY "Pros can read their own credit rows"
  ON public.pro_affiliate_credits FOR SELECT
  TO authenticated
  USING (
    (pro_kind = 'professional' AND pro_slug IN (
      SELECT slug FROM public.professionals
      WHERE auth_user_id = auth.uid()
    ))
    OR
    (pro_kind = 'team' AND pro_slug IN (
      SELECT t.slug
      FROM public.expert_teams t
      JOIN public.expert_team_members tm ON tm.team_id = t.id
      JOIN public.professionals p       ON p.id = tm.professional_id
      WHERE p.auth_user_id = auth.uid()
        AND tm.status = 'active'
    ))
  );

COMMIT;
