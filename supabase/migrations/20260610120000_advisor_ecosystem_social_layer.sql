-- Advisor ecosystem social layer: squad brief comments, article co-authors,
-- advisor-to-advisor lead referrals, team story, leaderboard community signals.
--
-- Rollback strategy:
--   DROP TABLE IF EXISTS public.team_brief_comments;
--   DROP TABLE IF EXISTS public.article_co_authors;
--   DROP TABLE IF EXISTS public.advisor_lead_referrals;
--   ALTER TABLE public.expert_teams DROP COLUMN IF EXISTS team_story;
--   ALTER TABLE public.advisor_leaderboard_monthly
--     DROP COLUMN IF EXISTS forum_answers_count,
--     DROP COLUMN IF EXISTS post_engagement_score,
--     DROP COLUMN IF EXISTS brief_completions_count;
-- All statements are idempotent; re-running is a no-op.

-- ── 1. team_brief_comments ─────────────────────────────────────────────
-- Private advisor↔advisor coordination notes on a brief inside a Pro Squad.
-- Deliberately a separate table from brief_messages: that table is
-- consumer-visible by design, and internal notes must never be able to
-- leak through its read policies.
CREATE TABLE IF NOT EXISTS public.team_brief_comments (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  brief_id integer NOT NULL,
  team_id integer NOT NULL,
  author_professional_id integer NOT NULL,
  body text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT team_brief_comments_body_len CHECK (char_length(body) >= 1 AND char_length(body) <= 2000)
);

CREATE INDEX IF NOT EXISTS team_brief_comments_team_brief_idx
  ON public.team_brief_comments (team_id, brief_id, created_at);

ALTER TABLE public.team_brief_comments ENABLE ROW LEVEL SECURITY;

-- Active members of the team can read the thread.
DROP POLICY IF EXISTS team_brief_comments_member_select ON public.team_brief_comments;
CREATE POLICY team_brief_comments_member_select ON public.team_brief_comments
  FOR SELECT TO authenticated
  USING (
    team_id IN (
      SELECT m.team_id
      FROM expert_team_members m
      JOIN professionals p ON p.id = m.professional_id
      WHERE p.auth_user_id = auth.uid() AND m.status = 'active'
    )
  );

-- Members may only insert comments authored as themselves, on their own team.
DROP POLICY IF EXISTS team_brief_comments_member_insert ON public.team_brief_comments;
CREATE POLICY team_brief_comments_member_insert ON public.team_brief_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    author_professional_id IN (
      SELECT p.id FROM professionals p WHERE p.auth_user_id = auth.uid()
    )
    AND team_id IN (
      SELECT m.team_id
      FROM expert_team_members m
      JOIN professionals p ON p.id = m.professional_id
      WHERE p.auth_user_id = auth.uid() AND m.status = 'active'
    )
  );

DROP POLICY IF EXISTS team_brief_comments_service_role ON public.team_brief_comments;
CREATE POLICY team_brief_comments_service_role ON public.team_brief_comments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── 2. article_co_authors ──────────────────────────────────────────────
-- Dual attribution on advisor articles. Invite flows through the portal;
-- accepted rows drive the public byline + Person JSON-LD.
CREATE TABLE IF NOT EXISTS public.article_co_authors (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  article_id integer NOT NULL,
  professional_id integer NOT NULL,
  invited_by_professional_id integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  invite_token text NOT NULL,
  responded_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT article_co_authors_status_chk
    CHECK (status IN ('pending', 'accepted', 'declined', 'revoked')),
  CONSTRAINT article_co_authors_distinct_parties
    CHECK (professional_id <> invited_by_professional_id),
  CONSTRAINT article_co_authors_unique_pair UNIQUE (article_id, professional_id),
  CONSTRAINT article_co_authors_token_unique UNIQUE (invite_token)
);

CREATE INDEX IF NOT EXISTS article_co_authors_article_idx
  ON public.article_co_authors (article_id, status);

ALTER TABLE public.article_co_authors ENABLE ROW LEVEL SECURITY;

-- Public read of *accepted* rows only — powers the public dual byline.
-- Pending invitations (and their tokens) are never exposed: the token
-- column is only reachable via service role because this policy filters
-- to accepted rows and the API never echoes tokens back.
DROP POLICY IF EXISTS article_co_authors_public_read ON public.article_co_authors;
CREATE POLICY article_co_authors_public_read ON public.article_co_authors
  FOR SELECT TO public
  USING (status = 'accepted');

-- Either party (inviter or invitee) can see the full row when logged in.
DROP POLICY IF EXISTS article_co_authors_party_select ON public.article_co_authors;
CREATE POLICY article_co_authors_party_select ON public.article_co_authors
  FOR SELECT TO authenticated
  USING (
    professional_id IN (SELECT p.id FROM professionals p WHERE p.auth_user_id = auth.uid())
    OR invited_by_professional_id IN (SELECT p.id FROM professionals p WHERE p.auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS article_co_authors_service_role ON public.article_co_authors;
CREATE POLICY article_co_authors_service_role ON public.article_co_authors
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── 3. advisor_lead_referrals ──────────────────────────────────────────
-- Structured advisor→advisor client referral. The receiver gets the lead
-- at no charge; the referrer earns a flat platform credit on conversion
-- (kind='referral_payout', reference_type='advisor_lead_referral'),
-- gated by the `advisor_lead_referral_bonus` feature flag (default off).
-- Lean-lane posture: flat B2B credit, never a % of an advice fee, no
-- consumer money intermediation.
CREATE TABLE IF NOT EXISTS public.advisor_lead_referrals (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  from_professional_id integer NOT NULL,
  to_professional_id integer NOT NULL,
  source_lead_id integer,
  created_lead_id integer,
  client_name text NOT NULL,
  client_email text NOT NULL,
  client_phone text,
  note text,
  status text NOT NULL DEFAULT 'pending',
  bonus_cents integer NOT NULL DEFAULT 0,
  bonus_recorded_at timestamp with time zone,
  responded_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT advisor_lead_referrals_status_chk
    CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'converted')),
  CONSTRAINT advisor_lead_referrals_distinct_parties
    CHECK (from_professional_id <> to_professional_id),
  CONSTRAINT advisor_lead_referrals_client_name_len
    CHECK (char_length(client_name) >= 1 AND char_length(client_name) <= 120),
  CONSTRAINT advisor_lead_referrals_client_email_len
    CHECK (char_length(client_email) >= 3 AND char_length(client_email) <= 200),
  CONSTRAINT advisor_lead_referrals_note_len
    CHECK (note IS NULL OR char_length(note) <= 500)
);

CREATE INDEX IF NOT EXISTS advisor_lead_referrals_from_idx
  ON public.advisor_lead_referrals (from_professional_id, created_at DESC);
CREATE INDEX IF NOT EXISTS advisor_lead_referrals_to_idx
  ON public.advisor_lead_referrals (to_professional_id, status, created_at DESC);

ALTER TABLE public.advisor_lead_referrals ENABLE ROW LEVEL SECURITY;

-- Referrals carry client PII: readable only by the two advisors party to
-- the referral. All writes go through the service-role API (cross-user
-- mutation with membership/ownership checks the anon role can't perform).
DROP POLICY IF EXISTS advisor_lead_referrals_party_select ON public.advisor_lead_referrals;
CREATE POLICY advisor_lead_referrals_party_select ON public.advisor_lead_referrals
  FOR SELECT TO authenticated
  USING (
    from_professional_id IN (SELECT p.id FROM professionals p WHERE p.auth_user_id = auth.uid())
    OR to_professional_id IN (SELECT p.id FROM professionals p WHERE p.auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS advisor_lead_referrals_service_role ON public.advisor_lead_referrals;
CREATE POLICY advisor_lead_referrals_service_role ON public.advisor_lead_referrals
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── 4. expert_teams.team_story ─────────────────────────────────────────
-- Long-form "our story" prose for the public team page (description stays
-- the short blurb). Length is validated app-side (≤5000 chars).
ALTER TABLE public.expert_teams ADD COLUMN IF NOT EXISTS team_story text;

-- ── 5. Leaderboard community signals ───────────────────────────────────
ALTER TABLE public.advisor_leaderboard_monthly
  ADD COLUMN IF NOT EXISTS forum_answers_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.advisor_leaderboard_monthly
  ADD COLUMN IF NOT EXISTS post_engagement_score integer NOT NULL DEFAULT 0;
ALTER TABLE public.advisor_leaderboard_monthly
  ADD COLUMN IF NOT EXISTS brief_completions_count integer NOT NULL DEFAULT 0;
