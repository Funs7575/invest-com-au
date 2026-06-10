-- Migration: seed savings_rate_snapshots with realistic 2026 AU rates.
--
-- DEMO / DOGFOOD DATA — verify against each provider's PDS before
-- production. The rate-alerts cron (FIN_NOTEBOOK Revenue #4) needs
-- non-empty snapshots to actually fire notifications; this seed gives
-- it 12 savings + 10 term-deposit headlines drawn from the 22 brokers
-- already present in the brokers table.
--
-- Source of truth for the actual numbers will eventually be:
--   1. A weekly scheduled scrape (post-launch, partner-feed permitting), OR
--   2. A weekly admin CSV import via /api/admin/savings-rates/import
--      (the route ships in 20260518040000 / today's PR).
--
-- Until that ingestion runs, this seed is the rate-alerts cron's data.
-- Idempotent: `ON CONFLICT DO NOTHING` against a uniqueness pair the
-- table doesn't enforce — we emulate it by skipping if any snapshot
-- already exists for the broker_id × product_kind pair.
--
-- Rollback:
--   DELETE FROM public.savings_rate_snapshots
--     WHERE source = 'manual'
--     AND notes LIKE '%— %';   -- the demo-data rows all carry an em-dash separator

BEGIN;

INSERT INTO public.savings_rate_snapshots (broker_id, product_kind, rate_bps, intro_rate_bps, intro_term_months, min_balance_cents, max_balance_cents, source, notes)
SELECT * FROM (VALUES
  (61, 'savings_account', 540, NULL::integer, NULL::integer, 0::bigint, 10000000::bigint, 'manual', 'ING Savings Maximiser headline — requires monthly deposit + 5+ card purchases + grow balance'),
  (62, 'savings_account', 510, NULL, NULL, 0, NULL, 'manual', 'Ubank Save — no conditions, any age'),
  (63, 'savings_account', 535, 535, 4, 0, 25000000, 'manual', 'Macquarie Savings — bonus 4 months from open, then 4.35% ongoing'),
  (94, 'savings_account', 520, NULL, NULL, 0, 5000000, 'manual', 'AMP Saver bonus — monthly deposit required, base 1.10%'),
  (68, 'savings_account', 490, NULL, NULL, 0, NULL, 'manual', 'ANZ Plus Save — no conditions, no balance tiers above $0'),
  (67, 'savings_account', 500, NULL, NULL, 0, 25000000, 'manual', 'Westpac Life — bonus needs monthly deposit + grow balance, base 0.85%'),
  (66, 'savings_account', 555, NULL, NULL, 0, 25000000, 'manual', 'ME Bank Online Savings — bonus requires 4+ card purchases per month, base 0.55%'),
  (92, 'savings_account', 465, NULL, NULL, 0, NULL, 'manual', 'CBA GoalSaver bonus — needs deposit + no withdrawal in month, base 0.35%'),
  (93, 'savings_account', 540, 540, 4, 0, 25000000, 'manual', 'Rabobank Saver intro — 4 months then 3.55% ongoing'),
  (64, 'savings_account', 510, NULL, NULL, 0, 5000000, 'manual', 'BOQ Future Saver — age 14-35 only, monthly deposit required'),
  (65, 'savings_account', 505, NULL, NULL, 0, 5000000, 'manual', 'Great Southern Bank Saver — bonus, base 0.30%'),
  (95, 'savings_account', 535, NULL, NULL, 0, 25000000, 'manual', 'Virgin Money Boost Saver — bonus needs monthly deposit + grow balance'),
  (69, 'term_deposit', 530, NULL, NULL, 100000000, NULL, 'manual', 'Judo Bank 12mo TD — min $1k, headline pre-tax'),
  (71, 'term_deposit', 505, NULL, NULL, 500000, NULL, 'manual', 'Macquarie 12mo TD — min $5k, monthly interest paid'),
  (73, 'term_deposit', 500, NULL, NULL, 250000, NULL, 'manual', 'AMP 12mo TD — min $2.5k'),
  (70, 'term_deposit', 515, NULL, NULL, 100000, NULL, 'manual', 'ING 12mo TD — min $1k, online application'),
  (72, 'term_deposit', 510, NULL, NULL, 100000, NULL, 'manual', 'BOQ 12mo TD'),
  (107, 'term_deposit', 505, NULL, NULL, 100000, NULL, 'manual', 'Rabobank 12mo TD — min $1k'),
  (74, 'term_deposit', 485, NULL, NULL, 500000, NULL, 'manual', 'NAB 12mo TD — min $5k'),
  (105, 'term_deposit', 475, NULL, NULL, 500000, NULL, 'manual', 'CBA 12mo TD — min $5k'),
  (106, 'term_deposit', 470, NULL, NULL, 500000, NULL, 'manual', 'ANZ 12mo TD — min $5k'),
  (104, 'term_deposit', 480, NULL, NULL, 500000, NULL, 'manual', 'Westpac 12mo TD — min $5k')
) AS new_rows(broker_id, product_kind, rate_bps, intro_rate_bps, intro_term_months, min_balance_cents, max_balance_cents, source, notes)
WHERE NOT EXISTS (
  SELECT 1 FROM public.savings_rate_snapshots existing
  WHERE existing.broker_id = new_rows.broker_id
    AND existing.product_kind = new_rows.product_kind
);

COMMIT;
