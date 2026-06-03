-- Migration: create versus_votes table
--
-- WHY: app/api/versus/vote/route.ts reads (GET) and writes (POST) the
--      `versus_votes` table, but no migration ever created it. On the live DB
--      this means every request 500s ("relation \"versus_votes\" does not
--      exist") — the broker-vs-broker community voting feature is fully broken
--      on every comparison page.
--      Discovered: 2026-06-03 AI-Journey run — see bots/reports/ai-journey-2026-06-03.md.
--
-- HELD — FOUNDER REVIEW ONLY. Do not auto-merge / auto-apply. Columns below are
--      mirrored exactly from the route (broker_a_slug, broker_b_slug,
--      chosen_slug, ip_hash, created_at). Confirm against prod before applying.
--
-- ROLLBACK: DROP TABLE IF EXISTS versus_votes;   (no dependent objects)
-- Idempotent: IF NOT EXISTS throughout — safe to re-run.

CREATE TABLE IF NOT EXISTS versus_votes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_a_slug text NOT NULL,          -- normalised so broker_a_slug < broker_b_slug (route normalisePair)
  broker_b_slug text NOT NULL,
  chosen_slug   text NOT NULL,
  ip_hash       text NOT NULL,          -- sha256(ip + VOTE_SALT) sliced to 32 chars (route hashVoter)
  created_at    timestamptz NOT NULL DEFAULT now(),
  -- chosen must be one of the two contenders (mirrors the route's pre-insert guard)
  CONSTRAINT versus_votes_chosen_chk CHECK (chosen_slug IN (broker_a_slug, broker_b_slug))
);

-- One vote per (pair, voter): backs the route's pre-insert dedup SELECT and the
-- 23505-on-race expectation. Pair is always stored normalised (a < b).
CREATE UNIQUE INDEX IF NOT EXISTS versus_votes_dedup
  ON versus_votes (broker_a_slug, broker_b_slug, ip_hash);

-- Aggregate count lookups for GET ?a=&b=
CREATE INDEX IF NOT EXISTS versus_votes_pair_idx
  ON versus_votes (broker_a_slug, broker_b_slug);

-- RLS: user-data table (carries ip_hash). The route reads AND writes via the
-- service-role admin client (createAdminClient), which bypasses RLS — so enable
-- RLS with NO anon/authenticated policies. Public roles are denied by default;
-- only service_role can touch the table. (Same posture as feature_flags etc.)
ALTER TABLE versus_votes ENABLE ROW LEVEL SECURITY;
