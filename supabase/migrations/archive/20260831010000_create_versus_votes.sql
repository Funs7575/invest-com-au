-- Create the missing `versus_votes` table.
--
-- Found by the AI-journey bot sweep (2026-06-05, wealth-stack persona): every
-- /versus/* page's community-vote widget calls GET /api/versus/vote, which
-- queries `versus_votes` — but that table was never created by any migration.
-- The endpoint 500s on every pair (verified 5/5 retries across broker-vs-broker
-- and savings-vs-super pairs; to_regclass('public.versus_votes') = NULL in prod).
-- The feature (app/api/versus/vote/route.ts + the versus-page widget) shipped
-- without its schema.
--
-- Columns mirror exactly what the route reads/writes:
--   GET  selects chosen_slug filtered by (broker_a_slug, broker_b_slug)
--   POST inserts { broker_a_slug, broker_b_slug, chosen_slug, ip_hash, created_at }
--        and dedups on (broker_a_slug, broker_b_slug, ip_hash).
-- The route normalises each pair so broker_a_slug < broker_b_slug before storage.
--
-- Access is fully mediated by the route's service-role client (createAdminClient),
-- so RLS is enabled with a service_role-only policy: no anon/authenticated client
-- touches the table directly, and raw per-voter rows (incl. ip_hash) are never
-- exposed — only the aggregated tallies the GET endpoint returns.
--
-- Idempotent. Rollback: drop table public.versus_votes;

create table if not exists public.versus_votes (
  id           bigint generated always as identity primary key,
  broker_a_slug text not null,
  broker_b_slug text not null,
  chosen_slug   text not null,
  ip_hash       text not null,
  created_at    timestamptz not null default now()
);

-- One vote per normalised pair per hashed IP (the route's dedup check).
create unique index if not exists versus_votes_pair_voter_uniq
  on public.versus_votes (broker_a_slug, broker_b_slug, ip_hash);

-- Tally lookups filter by the normalised pair.
create index if not exists versus_votes_pair_idx
  on public.versus_votes (broker_a_slug, broker_b_slug);

alter table public.versus_votes enable row level security;

drop policy if exists "service_role manages versus_votes" on public.versus_votes;
create policy "service_role manages versus_votes"
  on public.versus_votes
  for all
  to public
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');
