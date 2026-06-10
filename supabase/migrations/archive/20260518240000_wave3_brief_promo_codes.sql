-- Wave-3 brief marketplace promo codes.
--
-- Two tables:
--   brief_promo_codes — admin-minted, code-based discounts/credits applied
--     at brief creation. Three kinds:
--       'free_brief'           — first brief is free regardless of credit cost
--       'percent_off_accept'   — N% off the accept_credits_cost
--       'fixed_credits'        — N credits added to the brief poster
--   brief_promo_redemptions — append-only ledger of which brief redeemed
--     which code. Unique on (promo_code_id, brief_id) so a code can't be
--     applied twice to the same brief.
--
-- RLS:
--   brief_promo_codes — service_role only. Codes are admin-managed; the
--     /api/admin/promo-codes endpoints proxy through requireAdminAuth.
--   brief_promo_redemptions — service_role only. Same reasoning; the
--     redemption is recorded by trusted server code during brief creation.
--
-- Rollback: DROP TABLE brief_promo_redemptions, brief_promo_codes CASCADE;
--   No data downstream depends on these tables yet — they're additive.

create table if not exists brief_promo_codes (
  id bigserial primary key,
  code text not null unique,
  code_kind text not null check (
    code_kind in ('free_brief', 'percent_off_accept', 'fixed_credits')
  ),
  -- For 'percent_off_accept' this is the percentage (e.g. 25 = 25% off).
  -- For 'fixed_credits' this is the number of credits added.
  -- For 'free_brief' this is ignored (kept nullable for forward-compat).
  value numeric,
  max_uses integer not null default 1 check (max_uses >= 1),
  used_count integer not null default 0 check (used_count >= 0),
  expires_at timestamptz,
  created_by_admin text,
  created_at timestamptz not null default now(),
  notes text,
  constraint promo_code_value_required check (
    code_kind = 'free_brief' or value is not null
  ),
  constraint promo_code_value_percent_range check (
    code_kind <> 'percent_off_accept' or (value > 0 and value <= 100)
  ),
  constraint promo_code_value_credits_positive check (
    code_kind <> 'fixed_credits' or value > 0
  ),
  constraint promo_code_used_le_max check (used_count <= max_uses)
);

create index if not exists idx_brief_promo_codes_code on brief_promo_codes (code);
create index if not exists idx_brief_promo_codes_expires_at on brief_promo_codes (expires_at)
  where expires_at is not null;

create table if not exists brief_promo_redemptions (
  id bigserial primary key,
  promo_code_id bigint not null references brief_promo_codes(id) on delete restrict,
  brief_id bigint not null references advisor_auctions(id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  contact_email text,
  unique (promo_code_id, brief_id)
);

create index if not exists idx_brief_promo_redemptions_brief_id on brief_promo_redemptions (brief_id);
create index if not exists idx_brief_promo_redemptions_code_id on brief_promo_redemptions (promo_code_id);

alter table brief_promo_codes enable row level security;
alter table brief_promo_redemptions enable row level security;

-- Service-role only. Anon/authenticated should never need to read these
-- directly — code validity is checked by the brief-creation server flow,
-- never returned to the client.
create policy brief_promo_codes_service_role_all on brief_promo_codes
  for all to service_role using (true) with check (true);

create policy brief_promo_redemptions_service_role_all on brief_promo_redemptions
  for all to service_role using (true) with check (true);

comment on table brief_promo_codes is
  'Admin-minted promo codes for the brief marketplace. Service-role only RLS.';
comment on table brief_promo_redemptions is
  'Append-only log of brief_id × promo_code_id redemptions.';
