# Investor Accounts — End-to-End Implementation Plan

**Author:** Claude (pre-launch-wave loop)
**Date:** 2026-05-09
**For:** finnduns@gmail.com
**Source plans this builds on:**
- `docs/plans/sleepy-growing-planet.md` — original PR-X5 brief (~1 week)
- `docs/plans/pre-launch-wave-status.md` — current loop queue
- `feedback_aggressive_execution.md` — no post-launch deferral; 6-month AFSL window is build runway
- FIN_NOTEBOOK 2026-05-01 — cross-border revenue strategy

---

## What this is

The original PR-X5 brief said "investor / end-user accounts ~1 week, scope: account model + saved searches/comparisons/wizard prefill." This plan expands it into a full investor product with **portfolio-level features**, sequenced to ship iteratively across the AFSL pre-launch window (~6 months from 2026-05-09 → ~2026-11-09).

**Core idea:** investor accounts are the highest-LTV reason a user would create an account on a comparison site. Manual holdings + watchlists + portfolio health score + switching coach turns the site from "compare brokers once" → "your investing dashboard, every day."

---

## Compliance posture (the constraint shaping every feature)

invest.com.au is pre-AFSL. Personal advice (tailored recommendations based on a user's specific circumstances) requires AFSL. Without AFSL we can ship:

- ✅ **Comparison + ranking** (existing /best/[slug] pattern)
- ✅ **Aggregation + display** (show holdings, compute totals)
- ✅ **General education + factual content** (rule alerts, schemes & grants)
- ✅ **Tools that compute factual outcomes** (CGT estimator, FX cost calculator, switching cost compare)
- ✅ **Lead routing to AFSL-licensed advisors** (existing flow)

Cannot ship pre-AFSL:
- ❌ "Based on your holdings, you should rebalance to X" (personal advice)
- ❌ "We recommend you switch to Broker Y" (without it being a comparison-driven, broker-side editorial choice)
- ❌ Auto-trades / order execution

The framing rule: every personalized output must be a **comparison or factual computation**, not an opinion or recommendation.

---

## Phase 1 — Foundation (PR-X5a → -X5d, ~5 days)

The minimum viable investor product. Ships in 4 PRs.

### PR-X5a — Schema + auth wiring (½ day, Tier B)
**Files:**
- `supabase/migrations/<date>_investor_profiles.sql` (new)
- `lib/investor-session.ts` (new) — `requireInvestorSession(req)` mirroring `lib/require-advisor-session.ts`
- `lib/account-types.ts` (modify) — extend AccountKind union with `"investor"`
- `__tests__/lib/investor-session.test.ts` (new) — RLS isolation tests

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS public.investor_profiles (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  auth_user_id    uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    text,
  email           text NOT NULL,                    -- denorm cache, refreshed on touch
  iv_intent_country text,                           -- snapshot from cookie at sign-up
  prefers_marketing boolean DEFAULT false,          -- explicit opt-in
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.investor_profiles ENABLE ROW LEVEL SECURITY;

-- Investor reads ONLY their own row
CREATE POLICY "investor reads self"
  ON public.investor_profiles FOR SELECT TO authenticated
  USING (auth.uid() = auth_user_id);

-- Investor updates ONLY their own non-id fields
CREATE POLICY "investor updates self"
  ON public.investor_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = auth_user_id);

-- Service role full
CREATE POLICY "service_role full"
  ON public.investor_profiles FOR ALL TO service_role
  USING (true) WITH CHECK (true);
```

**Why this PR is small:** no UI, no public-facing routes — just the foundation. Mirrors `professionals` + `broker_accounts` shape so the existing patterns generalise.

### PR-X5b — Sign-up + portal shell + watchlists (1-2 days, Tier B)
**Files:**
- `app/sign-up/page.tsx` (new) — magic-link sign-up, captures `iv_intent_country` snapshot
- `app/sign-in/page.tsx` (new) — magic-link sign-in
- `app/investor-portal/page.tsx` (new) — empty shell with tabs: Watchlists / Holdings / Settings
- `app/investor-portal/WatchlistsTab.tsx` (new)
- `app/api/investor-auth/watchlists/route.ts` (new) — GET (own watchlist) / POST (add) / DELETE (remove)
- `supabase/migrations/<date>_investor_watchlists.sql` (new)

**Watchlists schema:**
```sql
CREATE TABLE IF NOT EXISTS public.investor_watchlists (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  investor_id     bigint NOT NULL REFERENCES investor_profiles(id) ON DELETE CASCADE,
  entity_type     text NOT NULL CHECK (entity_type IN ('broker','advisor','fund','listing','article')),
  entity_id       bigint,                           -- nullable when entity_slug used
  entity_slug     text,                             -- url slug as fallback
  added_at        timestamptz NOT NULL DEFAULT now(),
  notes           text,
  UNIQUE (investor_id, entity_type, COALESCE(entity_slug, entity_id::text))
);
```

**UX:** On every broker / advisor / fund card, show a heart icon. Click → adds to watchlist (or sign-up modal if not authed). Watchlist tab shows all saved items grouped by type, with link to entity + remove button.

**Why high ROI:** lowest-friction reason to sign up. Doesn't require typing any data.

### PR-X5c — Manual Holdings Tracker (1-2 days, Tier B)
**Files:**
- `supabase/migrations/<date>_investor_holdings.sql` (new)
- `app/investor-portal/HoldingsTab.tsx` (new) — list + add modal
- `app/api/investor-auth/holdings/route.ts` (new) — full CRUD
- `lib/holdings/value.ts` (new) — server-side value lookup using free price API
- `lib/holdings/value-source.ts` (new) — abstraction over the price API (start with [yahoo finance via a node lib] or the free Marketstack tier)
- `__tests__/lib/holdings/value.test.ts` (new)

**Holdings schema:**
```sql
CREATE TABLE IF NOT EXISTS public.investor_holdings (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  investor_id     bigint NOT NULL REFERENCES investor_profiles(id) ON DELETE CASCADE,
  ticker          text NOT NULL,                    -- 'BHP.AX', 'AAPL', 'BTC-AUD'
  exchange        text NOT NULL,                    -- 'ASX','NASDAQ','NYSE','LSE','CRYPTO','OTHER'
  shares          numeric(20, 8) NOT NULL CHECK (shares > 0),
  cost_basis_per_share_cents bigint NOT NULL CHECK (cost_basis_per_share_cents >= 0),
  acquired_at     date NOT NULL,
  broker_slug     text,                             -- which broker holds it (free-text)
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_investor_holdings_investor ON investor_holdings(investor_id);
```

**UX:** Add Holding modal: ticker + exchange + shares + cost/share + acquired date + broker. Holdings tab lists all + total cost basis + total current value + gain/loss.

**Compliance:** display only. No advice. "General information — see your accountant for tax."

**Price API:** Yahoo Finance unofficial via `yahoo-finance2` npm (free, no key, sometimes rate-limited). Fallback: Marketstack free tier (100 req/mo). Cache 24h per ticker in `holdings_price_cache` table.

### PR-X5d — Portfolio Health Score + Switching Coach (2 days, Tier B)
**Files:**
- `lib/holdings/health-score.ts` (new) — pure function: holdings → { diversificationScore, feeEfficiencyScore, overallScore, callouts: string[] }
- `lib/holdings/switching-coach.ts` (new) — pure function: holdings + estimated trade frequency → broker comparison + savings estimate
- `app/investor-portal/HoldingsTab.tsx` (modify) — render score block + switching block below holdings list
- `__tests__/lib/holdings/health-score.test.ts` (new)
- `__tests__/lib/holdings/switching-coach.test.ts` (new)

**Score axes:**
- Diversification: asset class spread + sector concentration + geographic spread (via ticker exchange)
- Fee efficiency: weighted avg fees you're paying (broker_slug → lookup brokers table) vs market median for that vertical
- Concentration risk: any holding >25% of portfolio flagged

**Switching Coach UX:**
> "You traded 20x in the last 12 months at avg ~$20/trade through Stake = ~$400/yr in brokerage. CommSec at $5/trade saves you $300/yr. [Compare brokers →]"

**Compliance:** comparison-driven, not advice. Same legal footing as /best/[slug] pages, just personalized to the visitor's actual usage.

---

## Phase 2 — High-leverage extensions (PR-X5e → -X5g, ~5 days)

After Phase 1 ships, these extend the foundation.

### PR-X5e — CSV import from top 5 brokers (2-3 days, Tier B)
- CommSec / Stake / Selfwealth / NABTrade / IBKR transaction CSV parsers
- Each parser is brittle (different column names / date formats / corporate action handling) — accept that maintenance is ongoing
- Bulk import to investor_holdings
- Zod-validated; error rows surface in the UI for user to fix
- Each broker's parser ships in its own micro-PR if needed

### PR-X5f — Tax-time pre-fill + advisor handoff (1-2 days, Tier B)
- "Generate Tax Year Summary" button → renders PDF/CSV with all holdings + cost basis + dividends + sales
- "Send to your advisor" button → routes to /find-advisor with the file attached as a structured handoff (advisor receives a link to a read-only investor profile snapshot)
- High advisor-side value; advisors LOVE leads who arrive structured

### PR-X5g — Sharesight OAuth read (1-2 days, Tier B)
- Sharesight is the dominant AU portfolio tracker (~50k+ AU users)
- OAuth connect → import all holdings + transactions
- Skips Phase 2's CSV friction for ~5-10% of AU investors
- Read-only, no compliance issue

---

## Phase 3 — Goal tracking + watchlist alerts (PR-X5h → -X5i, ~3 days)

### PR-X5h — Goal Tracker (1 day, Tier B)
- "Save $500k by 2030 for house deposit" → current portfolio trajectory vs goal
- Pure projection ("at current rate you'll hit $X by date Y") — no advice
- Surfaces `general information only` disclaimer

### PR-X5i — Watchlist email alerts (2 days, Tier B)
- Cron sweep: daily compare watched entities' state to last-snapshot state
- Email digest when changes: broker fee changed, deal added/expired, new article published
- Uses existing Resend infrastructure (lib/resend.ts)
- Per-user opt-in (default off)

---

## Phase 4 — AFSL-gated features (PR-X5j → -X5k, ~5 days build, ship after AFSL grant)

Build the engines now, gate behind a flag. Surface after AFSL grant ~2026-11.

### PR-X5j — AI portfolio analysis (3-4 days)
- Claude prompt with the investor's holdings + risk profile (from sign-up survey)
- Outputs: "Diversification observations / sector concentration analysis / suggestions to discuss with your advisor"
- Pre-AFSL surface: "Tax estimate based on current holdings" (factual)
- Post-AFSL surface: full portfolio analysis with rebalance suggestions
- Feature flag: `investor_ai_analysis_enabled` (default false)

### PR-X5k — Open Banking / CDR (multi-month elapsed, parallel work)
- **Engineering**: 1-2 weeks (CDR data access spec + connect flow + import to holdings)
- **Regulatory**: separate CDR accreditation application — multi-month lead time
- **Action item NOW (parallel to engineering)**: start the CDR application paperwork immediately — it has no software dependency

---

## Phase 5 — Premium tier (PR-X5l → -X5m, ~3 days)

Once Phase 1-3 are live + investor accounts have meaningful adoption:

### PR-X5l — Investor Pro tier (2 days)
- $9.99/mo or $99/yr Stripe subscription
- Unlocks: unlimited holdings (free tier capped at 20), Sharesight sync, tax pre-fill PDF, advisor handoff, AI analysis (post-AFSL)
- Free tier remains: manual holdings (capped 20) + watchlists + health score + goal tracker
- Reuses PR-B1 ledger pattern + customer portal from advisor billing

### PR-X5m — Premium content gating (1 day)
- Premium research subscription (FIN_NOTEBOOK item #10) integration
- Pro tier unlocks long-form investor reports + monthly newsletter

---

## Sequencing — when each ships

Calibrated to current loop velocity (~3-5 PRs merged per day in burst mode):

| Week | PRs to ship |
|---|---|
| Week 1 (now → 2026-05-16) | X5a, X5b, X5c, X5d (Phase 1 complete — investor product v1 live) |
| Week 2 | X5e (CSV import), X5f (tax pre-fill) |
| Week 3 | X5g (Sharesight), X5h (goal tracker) |
| Week 4 | X5i (watchlist alerts), X5j infra (AI engine, gated) |
| Week 5-6 | X5k engineering (CDR import), submit CDR application |
| Week 8-12 | X5l (premium tier), X5m (content gating) |
| Post-AFSL grant (~Nov 2026) | Flip flags on AI analysis + CDR + premium tax features |

---

## Compliance / risk register

| Risk | Mitigation |
|---|---|
| Pre-AFSL "personal advice" boundary | Every personalized output framed as comparison or factual computation; "general information only" disclaimer on every personalized surface; AI analysis behind feature flag |
| Personal financial data security | RLS-scoped per investor; service-role-only for admin paths; encrypted at rest (Supabase default); no payment data stored (Stripe customer portal handles all card surfaces) |
| CDR data access regulatory delay | Start application now (parallel to engineering); ship Sharesight OAuth as alternative path |
| Free price API rate limits | 24h cache per ticker in `holdings_price_cache`; fallback API; hard daily refresh limit per investor |
| Stripe subscription edge cases | Reuse PR-B1 (advisor ledger) + PR-B3 (no-lock-in) patterns; same customer-portal Stripe surface; same dispute / refund-as-credit policy |
| Watchlist email volume / unsubscribe | Default off; daily-not-per-event; unsubscribe link mandatory; Resend bounce handling already wired |

---

## Open decisions (queued, no answer yet)

1. **Free tier cap** — 20 holdings? 50? Unlimited? (Recommendation: 20 forces upgrade for serious investors)
2. **Premium price** — $9.99/mo / $99/yr vs higher? (Recommendation: start at $99/yr, raise after 100+ paid)
3. **Sharesight partnership** — try for an official integration / referral fee, or just use their public OAuth?
4. **Newsletter cadence** — daily watchlist alerts or weekly digest? (Recommendation: weekly default, daily as opt-in)
5. **Crypto in holdings** — first-class support (Phase 1) or follow-up? (Recommendation: include CRYPTO exchange enum from day 1; price source via free CoinGecko API)
6. **Holdings privacy** — opt-in to share aggregate holdings (anonymised) for "investors like you also hold X" social proof? (Defer to post-launch decision)

---

## Resourcing

Loop velocity: ~3-5 PRs/day in burst mode. Phase 1 (4 PRs) ~ 1 week of clock time. Full plan (15 PRs) ~ 6-8 weeks of clock time including CI / observation windows. Fits comfortably inside the 6-month AFSL window.

---

## Ready to start?

Recommended kickoff: PR-X5a (schema + auth wiring) — half-day of work, no UI dependencies, unblocks everything downstream.
