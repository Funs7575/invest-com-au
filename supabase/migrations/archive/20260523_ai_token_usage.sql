-- ============================================================
-- ai_token_usage — per-subject-per-route-per-day token + cost ledger
--
-- Source: V-NEW-06 (AI cost caps). Tracks token + cost spend so we
-- can enforce per-user-per-day caps + global daily budgets across
-- the public concierge (`/api/concierge`) and the admin agent
-- (`/api/admin/ai-chat`).
--
-- Why a single table covers two surfaces:
--   - Both subjects identify by an opaque string (IP key for
--     anonymous public, lowercased email for admin). The
--     `subject_type` column disambiguates the namespace so an IP
--     literally identical to an email (it can't be) doesn't collide.
--   - One UNIQUE row per (subject_id, subject_type, route, day)
--     means the cap pre-check is a single indexed lookup and the
--     post-stream "increment" is an UPSERT with arithmetic.
--   - Per-route global usage is SUM(cost_usd_micros) over today
--     filtered by route, served by the (route, day) index.
--
-- Cost is stored as `*_micros` integers (1 micro = $0.000001) so
-- DB-side arithmetic stays exact; pricing constants live in
-- `lib/ai-cost-caps.ts` per model. Storing the cost at write time
-- means changing the pricing constants doesn't retroactively
-- shift today's accounting.
--
-- Rollback: drop the table; the helpers fail closed (no row → 0
-- spend → cap pre-check trivially passes), so production keeps
-- working but the cap stops enforcing. RLS isolation: the table
-- is service-role-only; no public read, no anon write.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ai_token_usage (
  id                 bigserial PRIMARY KEY,
  subject_id         text NOT NULL,
  subject_type       text NOT NULL CHECK (subject_type IN ('public_session', 'admin_user')),
  route              text NOT NULL CHECK (route IN ('concierge', 'admin_agent')),
  day                date NOT NULL,
  tokens_in          bigint NOT NULL DEFAULT 0,
  tokens_out         bigint NOT NULL DEFAULT 0,
  cost_usd_micros    bigint NOT NULL DEFAULT 0,
  request_count      integer NOT NULL DEFAULT 0,
  alerted_80_at      timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_token_usage_unique
    UNIQUE (subject_id, subject_type, route, day)
);

-- Per-subject cap pre-check: WHERE subject_id = ? AND subject_type
-- = ? AND route = ? AND day = ?. Already covered by the UNIQUE
-- constraint above (Postgres backs UNIQUE with a btree index).

-- Global cap pre-check: WHERE route = ? AND day = ? — needs its
-- own index because the UNIQUE index leads with subject_id.
CREATE INDEX IF NOT EXISTS idx_ai_token_usage_route_day
  ON public.ai_token_usage (route, day);

-- Pruning index — periodic delete of rows older than 90 days.
CREATE INDEX IF NOT EXISTS idx_ai_token_usage_day
  ON public.ai_token_usage (day);

ALTER TABLE public.ai_token_usage ENABLE ROW LEVEL SECURITY;

-- Service role full access — every reader is the cap helper running
-- under the admin Supabase client. No anon/authenticated access.
DROP POLICY IF EXISTS "service_role full access" ON public.ai_token_usage;
CREATE POLICY "service_role full access" ON public.ai_token_usage
  AS PERMISSIVE FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.ai_token_usage IS
  'Per-subject-per-route-per-day token + cost ledger for AI cost caps (V-NEW-06). Service-role only.';
COMMENT ON COLUMN public.ai_token_usage.subject_id IS
  'Opaque identifier — IP key for public_session, lowercased email for admin_user.';
COMMENT ON COLUMN public.ai_token_usage.cost_usd_micros IS
  '1 micro = $0.000001. Stored at write time using the model''s pricing constants in lib/ai-cost-caps.ts.';
COMMENT ON COLUMN public.ai_token_usage.alerted_80_at IS
  'Timestamp of the most recent 80%-of-cap warning email for this row. Re-alerts after a fresh day.';
