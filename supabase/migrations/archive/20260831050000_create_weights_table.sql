-- Create the missing `weights` table — APPLIED TO PROD 2026-06-05.
-- app/api/wealth-stack reads from("weights").select("broker_slug, weights"), but
-- the table was never created → the wealth-stack ("Revenue #1") POST 500s on
-- every build (docs/audits/SCHEMA-DRIFT). Created with the exact shape the route
-- expects; empty by default (scorer falls back to rating order until seeded —
-- functional, no 500). Commercially-sensitive ranking weights like quiz_weights,
-- so RLS is service-role-only and wealth-stack reads it via the admin client.
-- Idempotent. Rollback: drop table public.weights;
create table if not exists public.weights (
  broker_slug text primary key,
  weights     jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);
alter table public.weights enable row level security;
drop policy if exists "service_role manages weights" on public.weights;
create policy "service_role manages weights" on public.weights
  for all to public
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');
