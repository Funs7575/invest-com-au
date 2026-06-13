-- Migration: prospect_pool + advisor_pitches — "Open to Offers", the reverse
-- marketplace (idea #7, docs/strategy/RETENTION_MARKETPLACE_MEGA_SESSIONS.md).
--
-- Consumers flip one switch ("Let vetted advisers pitch me — anonymously").
-- That writes a prospect_pool row holding an ANONYMISED snapshot (goals/intent,
-- state, budget band, timeline — NEVER name/email/contact/postcode). Vetted
-- advisers browse anonymised cards and spend credits to send ONE structured
-- pitch (advisor_pitches). The consumer accepts to reveal contact + open a
-- brief-equivalent chat, or declines silently (credits refunded to the adviser).
--
-- Compliance (REGULATORY-AVOID-LIST lean lane): pitch credits stay FLAT B2B
-- fees (lead routing — no consumer->adviser money). Pitch bodies are general
-- capability statements only (moderated via lib/text-moderation.ts + the 300-
-- char cap + explainer copy), never personal advice. The snapshot column is
-- anonymised AT WRITE TIME by lib/prospect-pool/snapshot.ts; no identity field
-- is ever serialised into it.
--
-- Dormancy: the whole feature is gated behind the `open_to_offers` feature flag
-- (fail-closed). With the flag off, no opt-in toggles render, the prospects tab
-- is hidden, and the APIs 404 — nothing 500s when these tables are absent
-- (helpers are written fail-soft).
--
-- RLS:
--   prospect_pool   = owner (auth.uid() = user_id) may SELECT + UPDATE their own
--                     row (the dashboard block pauses/withdraws/renews; the
--                     anonymised snapshot is built server-side via the admin
--                     client on INSERT so no anon INSERT policy is needed).
--                     service_role retains ALL access.
--   advisor_pitches = service-role-only. Advisor sessions carry NO JWT (legacy
--                     advisor_sessions have no auth.uid() linkage on
--                     professionals), so a row-owner policy is not expressible
--                     for the adviser side. The consumer reads THEIR pitches
--                     through /api/open-to-offers/pitches, which authenticates
--                     the user, looks up their prospect_pool row, and joins
--                     pitches on prospect_id server-side with the admin client.
--
-- Rollback:
--   DROP TABLE IF EXISTS public.advisor_pitches;
--   DROP TABLE IF EXISTS public.prospect_pool;

BEGIN;

-- ── prospect_pool ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.prospect_pool (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  -- One pool row per user. UNIQUE so opt-in is an idempotent upsert and pitch
  -- caps / suppression key cleanly off the prospect id.
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Anonymised snapshot, written by lib/prospect-pool/snapshot.ts. Contains
  -- ONLY non-identifying fields (advisor type, goal/intent, state, budget band,
  -- timeline, experience, cross-border flag). NEVER name/email/postcode/suburb.
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'expired')),
  -- 60-day expiry; the dashboard block surfaces a renewal nudge as expiry nears
  -- and renews by bumping expires_at + flipping status back to 'active' (no new
  -- cron — status/expires_at are read live).
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Adviser browse query filters on status='active' AND expires_at in the future.
CREATE INDEX IF NOT EXISTS idx_prospect_pool_active
  ON public.prospect_pool (status, expires_at);

ALTER TABLE public.prospect_pool ENABLE ROW LEVEL SECURITY;

-- Owner: read their own pool row (the dashboard block reflects current status).
DROP POLICY IF EXISTS "Users read own prospect row" ON public.prospect_pool;
CREATE POLICY "Users read own prospect row"
  ON public.prospect_pool FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Owner: update their own pool row (pause / withdraw / renew). INSERT stays on
-- the service-role path so the snapshot is anonymised server-side, never trusted
-- from the client.
DROP POLICY IF EXISTS "Users update own prospect row" ON public.prospect_pool;
CREATE POLICY "Users update own prospect row"
  ON public.prospect_pool FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Service role manages prospect_pool" ON public.prospect_pool;
CREATE POLICY "Service role manages prospect_pool"
  ON public.prospect_pool FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── advisor_pitches ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.advisor_pitches (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prospect_id uuid NOT NULL REFERENCES public.prospect_pool(id) ON DELETE CASCADE,
  professional_id integer NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  -- General capability statement only — enforced by lib/text-moderation.ts and
  -- the 300-char cap. NOT personal advice.
  body text NOT NULL CHECK (char_length(body) >= 1 AND char_length(body) <= 300),
  -- Adviser's own fee band estimate for the work (their fee — the platform
  -- never clips consumer->adviser money).
  fee_band text,
  -- Flat B2B credit cost charged to the adviser at pitch time (lead routing).
  credits_cost integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  -- When accepted, the brief-equivalent row created to inherit chat/SLA/dispute
  -- machinery (advisor_auctions.id). Null until accepted.
  brief_id integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  -- One pitch per adviser per prospect (cap + decline-suppression key).
  UNIQUE (prospect_id, professional_id)
);

-- Consumer inbox read: pitches for a prospect, newest first.
CREATE INDEX IF NOT EXISTS idx_advisor_pitches_prospect
  ON public.advisor_pitches (prospect_id, created_at DESC);
-- Adviser-side: "have I already pitched / been declined by this prospect".
CREATE INDEX IF NOT EXISTS idx_advisor_pitches_professional
  ON public.advisor_pitches (professional_id, status);
-- Per-prospect monthly cap counts pending+accepted pitches in a rolling window.
CREATE INDEX IF NOT EXISTS idx_advisor_pitches_prospect_created
  ON public.advisor_pitches (prospect_id, created_at);

ALTER TABLE public.advisor_pitches ENABLE ROW LEVEL SECURITY;

-- Service-role-only. Advisor sessions carry no JWT; the consumer reads their
-- pitches through an authenticated API that joins on their prospect row (see
-- header). No authenticated-role policy exists by design.
DROP POLICY IF EXISTS "Service role manages advisor_pitches" ON public.advisor_pitches;
CREATE POLICY "Service role manages advisor_pitches"
  ON public.advisor_pitches FOR ALL TO service_role
  USING (true) WITH CHECK (true);

COMMIT;
