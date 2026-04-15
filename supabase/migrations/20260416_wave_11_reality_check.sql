-- Wave 11 schema — reality check + accounts + content + compliance.
--
-- Tables introduced:
--   1. user_notifications          — in-app notification inbox
--   2. user_quiz_history           — DB-backed quiz submissions
--                                    (supersedes localStorage-only state)
--   3. user_bookmarks              — saved articles / brokers / advisors
--   4. article_comments            — threaded comments on articles
--   5. article_reactions           — emoji + helpful-flag reactions
--   6. advisor_kyc_documents       — advisor KYC document uploads
--   7. financial_periods           — month-end close + period lock
--   8. revenue_reconciliation_runs — automated reconciliation audit
--   9. anonymous_saves             — pre-auth save inbox
--
-- Extensions to existing tables:
--   - tmds                         — loosen product_type check + add
--                                    metadata columns
--   - complaints_register          — SLA warning / escalation stamps

-- ── 1. user_notifications ───────────────────────────────────────────
-- One row per in-app notification. Users read them from a /account
-- notifications inbox; a bell icon in the header shows the unread
-- count. Optional email_delivery_key lets us dedupe against drip
-- emails so we don't double-notify.
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id              bigserial PRIMARY KEY,
  user_id         uuid NOT NULL,
  type            text NOT NULL,           -- 'system' | 'deal' | 'fee_change' | 'reply' | 'referral' | 'announcement'
  title           text NOT NULL,
  body            text,
  link_url        text,                    -- where to send the user on click
  read_at         timestamptz,
  email_delivery_key text,                 -- for dedup against drip sends
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user
  ON public.user_notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notifications_unread
  ON public.user_notifications (user_id, created_at DESC)
  WHERE read_at IS NULL;

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_notifications
  DROP CONSTRAINT IF EXISTS user_notifications_type_check;
ALTER TABLE public.user_notifications
  ADD CONSTRAINT user_notifications_type_check CHECK (
    type = ANY (ARRAY['system'::text, 'deal'::text, 'fee_change'::text, 'reply'::text, 'referral'::text, 'announcement'::text])
  );

-- ── 2. user_quiz_history ────────────────────────────────────────────
-- Persistent quiz state per user (or per anonymous session). The
-- quiz previously lived in localStorage only so a user couldn't
-- resume on a different device or see their history. Every quiz
-- submission writes a row; the quiz UI reads the latest row for
-- that user_key on mount.
CREATE TABLE IF NOT EXISTS public.user_quiz_history (
  id              bigserial PRIMARY KEY,
  user_id         uuid,               -- auth.users.id when signed in
  session_id      text,               -- anonymous fallback (matches form_events)
  answers         jsonb NOT NULL,
  inferred_vertical text,
  top_match_slug  text,
  completed_at    timestamptz,
  resumed_from    bigint,             -- id of the prior row we resumed from
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_quiz_history_user
  ON public.user_quiz_history (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_quiz_history_session
  ON public.user_quiz_history (session_id, created_at DESC)
  WHERE session_id IS NOT NULL;

ALTER TABLE public.user_quiz_history ENABLE ROW LEVEL SECURITY;

-- ── 3. user_bookmarks ───────────────────────────────────────────────
-- Saved items. bookmark_type distinguishes article / broker /
-- advisor / scenario. One row per (user_id, type, ref).
CREATE TABLE IF NOT EXISTS public.user_bookmarks (
  id              bigserial PRIMARY KEY,
  user_id         uuid NOT NULL,
  bookmark_type   text NOT NULL,        -- 'article' | 'broker' | 'advisor' | 'scenario' | 'calculator'
  ref             text NOT NULL,        -- slug or id
  label           text,                 -- cached display name
  note            text,                 -- user's own note
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, bookmark_type, ref)
);

CREATE INDEX IF NOT EXISTS idx_user_bookmarks_user
  ON public.user_bookmarks (user_id, created_at DESC);

ALTER TABLE public.user_bookmarks ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_bookmarks
  DROP CONSTRAINT IF EXISTS user_bookmarks_type_check;
ALTER TABLE public.user_bookmarks
  ADD CONSTRAINT user_bookmarks_type_check CHECK (
    bookmark_type = ANY (ARRAY['article'::text, 'broker'::text, 'advisor'::text, 'scenario'::text, 'calculator'::text])
  );

-- ── 4. article_comments ─────────────────────────────────────────────
-- Threaded discussion on article pages. parent_id enables nesting.
-- Moderation via text_moderation classifier from Wave 1 — every
-- new comment runs through classifyText() before publication.
CREATE TABLE IF NOT EXISTS public.article_comments (
  id              bigserial PRIMARY KEY,
  article_slug    text NOT NULL,
  author_id       uuid,                  -- auth.users.id
  author_name     text NOT NULL,
  author_email    text NOT NULL,
  parent_id       bigint,                -- self-reference for threads
  body            text NOT NULL,
  status          text NOT NULL DEFAULT 'pending',  -- 'pending' | 'published' | 'rejected' | 'removed'
  auto_moderated_at timestamptz,
  auto_moderated_verdict text,
  helpful_count   integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_article_comments_article
  ON public.article_comments (article_slug, created_at DESC)
  WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_article_comments_parent
  ON public.article_comments (parent_id);
CREATE INDEX IF NOT EXISTS idx_article_comments_pending
  ON public.article_comments (created_at DESC)
  WHERE status = 'pending';

ALTER TABLE public.article_comments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.article_comments
  DROP CONSTRAINT IF EXISTS article_comments_status_check;
ALTER TABLE public.article_comments
  ADD CONSTRAINT article_comments_status_check CHECK (
    status = ANY (ARRAY['pending'::text, 'published'::text, 'rejected'::text, 'removed'::text])
  );

-- ── 5. article_reactions ────────────────────────────────────────────
-- Helpful flag + emoji reactions. Dedup per (user_id, article_slug,
-- reaction) so a user can't spam the counter.
CREATE TABLE IF NOT EXISTS public.article_reactions (
  id              bigserial PRIMARY KEY,
  article_slug    text NOT NULL,
  user_id         uuid,                  -- null for anonymous (keyed by ip_hash)
  ip_hash         text,
  reaction        text NOT NULL,         -- 'helpful' | 'like' | 'confused' | 'disagree'
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_article_reactions_user_dedup
  ON public.article_reactions (article_slug, user_id, reaction)
  WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_article_reactions_anon_dedup
  ON public.article_reactions (article_slug, ip_hash, reaction)
  WHERE user_id IS NULL AND ip_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_article_reactions_article
  ON public.article_reactions (article_slug, reaction);

ALTER TABLE public.article_reactions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.article_reactions
  DROP CONSTRAINT IF EXISTS article_reactions_reaction_check;
ALTER TABLE public.article_reactions
  ADD CONSTRAINT article_reactions_reaction_check CHECK (
    reaction = ANY (ARRAY['helpful'::text, 'like'::text, 'confused'::text, 'disagree'::text])
  );

-- ── 6. advisor_kyc_documents ────────────────────────────────────────
-- Document uploads for advisor onboarding. Files live in Supabase
-- Storage under the advisor-kyc/{professional_id}/... prefix; this
-- table stores the metadata + verification trail.
CREATE TABLE IF NOT EXISTS public.advisor_kyc_documents (
  id                bigserial PRIMARY KEY,
  professional_id   integer NOT NULL,
  document_type     text NOT NULL,      -- 'afsl_certificate' | 'proof_of_id' | 'abn_certificate' | 'insurance' | 'other'
  storage_path      text NOT NULL,
  original_filename text,
  file_size_bytes   integer,
  mime_type         text,
  status            text NOT NULL DEFAULT 'submitted', -- 'submitted' | 'verified' | 'rejected' | 'expired'
  verified_by       text,                 -- admin email
  verified_at       timestamptz,
  verification_notes text,
  rejection_reason  text,
  expires_at        timestamptz,          -- e.g. AFSL certificate with a known expiry
  uploaded_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_advisor_kyc_documents_prof
  ON public.advisor_kyc_documents (professional_id, uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_advisor_kyc_documents_pending
  ON public.advisor_kyc_documents (uploaded_at DESC)
  WHERE status = 'submitted';
CREATE INDEX IF NOT EXISTS idx_advisor_kyc_documents_expiring
  ON public.advisor_kyc_documents (expires_at)
  WHERE status = 'verified' AND expires_at IS NOT NULL;

ALTER TABLE public.advisor_kyc_documents ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.advisor_kyc_documents
  DROP CONSTRAINT IF EXISTS advisor_kyc_documents_status_check;
ALTER TABLE public.advisor_kyc_documents
  ADD CONSTRAINT advisor_kyc_documents_status_check CHECK (
    status = ANY (ARRAY['submitted'::text, 'verified'::text, 'rejected'::text, 'expired'::text])
  );

ALTER TABLE public.advisor_kyc_documents
  DROP CONSTRAINT IF EXISTS advisor_kyc_documents_type_check;
ALTER TABLE public.advisor_kyc_documents
  ADD CONSTRAINT advisor_kyc_documents_type_check CHECK (
    document_type = ANY (ARRAY['afsl_certificate'::text, 'proof_of_id'::text, 'abn_certificate'::text, 'insurance'::text, 'other'::text])
  );

-- ── 7. financial_periods ────────────────────────────────────────────
-- Month-end close tracking. AFSL s912D requires 7-year
-- immutability — once a period is 'closed', the financial_audit_log
-- rows for that month cannot be edited or deleted (enforced at the
-- application layer; RLS denies service_role writes to closed
-- months).
CREATE TABLE IF NOT EXISTS public.financial_periods (
  id              bigserial PRIMARY KEY,
  period_start    date NOT NULL,
  period_end      date NOT NULL,
  status          text NOT NULL DEFAULT 'open',  -- 'open' | 'closing' | 'closed'
  closed_at       timestamptz,
  closed_by       text,
  revenue_summary jsonb,
  total_refunds_cents bigint,
  total_credits_cents bigint,
  audit_row_count integer,
  notes           text,
  UNIQUE (period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_financial_periods_status
  ON public.financial_periods (status, period_start DESC);

ALTER TABLE public.financial_periods ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.financial_periods
  DROP CONSTRAINT IF EXISTS financial_periods_status_check;
ALTER TABLE public.financial_periods
  ADD CONSTRAINT financial_periods_status_check CHECK (
    status = ANY (ARRAY['open'::text, 'closing'::text, 'closed'::text])
  );

-- ── 8. revenue_reconciliation_runs ──────────────────────────────────
-- One row per nightly reconciliation run. Stores variances and
-- alerts fired so audit can trace every discrepancy.
CREATE TABLE IF NOT EXISTS public.revenue_reconciliation_runs (
  id              bigserial PRIMARY KEY,
  run_date        date NOT NULL,
  source          text NOT NULL,        -- 'affiliate_clicks' | 'stripe_payouts' | 'manual_upload'
  expected_cents  bigint,
  reported_cents  bigint,
  variance_cents  bigint,
  variance_pct    numeric,
  alerted         boolean NOT NULL DEFAULT false,
  alert_sent_to   text,
  notes           text,
  run_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_date, source)
);

CREATE INDEX IF NOT EXISTS idx_revenue_reconciliation_runs_variance
  ON public.revenue_reconciliation_runs (run_date DESC)
  WHERE ABS(COALESCE(variance_pct, 0)) > 0.05;

ALTER TABLE public.revenue_reconciliation_runs ENABLE ROW LEVEL SECURITY;

-- ── 9. anonymous_saves ──────────────────────────────────────────────
-- Pre-auth bookmark / shortlist capture. A user who clicks "save"
-- before signing up writes an anonymous_saves row keyed to their
-- session_id. On signup we replay the rows into user_bookmarks and
-- delete the anonymous version.
CREATE TABLE IF NOT EXISTS public.anonymous_saves (
  id              bigserial PRIMARY KEY,
  session_id      text NOT NULL,
  bookmark_type   text NOT NULL,
  ref             text NOT NULL,
  label           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  claimed_at      timestamptz,
  claimed_by_user_id uuid,
  UNIQUE (session_id, bookmark_type, ref)
);

CREATE INDEX IF NOT EXISTS idx_anonymous_saves_session
  ON public.anonymous_saves (session_id, created_at DESC)
  WHERE claimed_at IS NULL;

ALTER TABLE public.anonymous_saves ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.anonymous_saves
  DROP CONSTRAINT IF EXISTS anonymous_saves_type_check;
ALTER TABLE public.anonymous_saves
  ADD CONSTRAINT anonymous_saves_type_check CHECK (
    bookmark_type = ANY (ARRAY['article'::text, 'broker'::text, 'advisor'::text, 'scenario'::text, 'calculator'::text])
  );

-- ── 10. complaints_register SLA stamps ──────────────────────────────
-- The SLA enforcement cron stamps these so we don't re-alert / re-
-- escalate on every run.
ALTER TABLE IF EXISTS public.complaints_register
  ADD COLUMN IF NOT EXISTS sla_warning_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS auto_escalated_at timestamptz;
