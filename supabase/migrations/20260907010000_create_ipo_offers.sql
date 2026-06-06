-- Create ipo_offers table for the /api/ipo-offers public endpoint.
-- app/api/ipo-offers/route.ts was fully implemented but the table was never created
-- → every GET 500s on all environments. Anon SELECT is gated by is_published = true.
-- Rollback: drop table public.ipo_offers;
create table if not exists public.ipo_offers (
  id                         uuid primary key default gen_random_uuid(),
  asx_code                   text not null,
  company_name               text not null,
  sector                     text,
  offer_type                 text,
  status                     text not null default 'upcoming'
                               check (status in ('upcoming', 'open', 'closed', 'listed', 'withdrawn')),
  is_published               boolean not null default false,
  offer_open_date            date,
  offer_close_date           date,
  listing_date               date,
  issue_price_cents          integer,
  amount_raised_cents        bigint,
  minimum_application_cents  integer,
  first_day_return_pct       numeric(6, 2),
  note                       text,
  description                text,
  prospectus_url             text,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);

alter table public.ipo_offers enable row level security;

drop policy if exists "ipo_offers_public_read" on public.ipo_offers;
create policy "ipo_offers_public_read" on public.ipo_offers
  for select
  using (is_published = true);

drop policy if exists "ipo_offers_service_role" on public.ipo_offers;
create policy "ipo_offers_service_role" on public.ipo_offers
  for all
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');
