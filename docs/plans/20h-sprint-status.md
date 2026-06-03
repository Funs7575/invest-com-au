# Continuous-improvement loop — control doc + live log

**What this is:** the per-fire control document for the invest.com.au continuous-improvement loop
(bots/code-review discover → fix clean in-scope items → verify locally → merge to main; hold anything
regulated or risky for the founder). Each fire reads this first, then appends one dated entry.

> The **canonical dials + hard lines** live in the loop prompt the founder pastes each fire. This doc is the
> living log + a convenience summary. If they ever disagree, the pasted prompt wins.

## Dials (summary — prompt is canonical)

- **Auto-merge Tier A + B + C** to main (C after a 30-min quiet window). Mission = fix + build-heavy.
- **Merge gate** = "I'm the gate": local `tsc --noEmit` + relevant/full `vitest` + `eslint .` green **AND** the PR's
  `Lint · Type-check · Test · Build` check-run is `success`. **Ignore** three environmental reds — Vercel
  (billing-blocked), Preview smoke test, Supabase types drift. E2E + Lighthouse are non-blocking.
  `mergeable_state: "unstable"` is the normal mergeable state.
- **Hard lines (never autonomous):** avoid-list escalators (money-movement / %-of-advice-fee / personal advice /
  credit assistance / capital-raise / CDR / AML / custody / product-issuing) → held draft PR labelled
  `needs-founder-decision`; DB migrations (`supabase/migrations/*`) → held; Tier D / Tier E / founder-authored PRs
  → never. When in doubt: document for the founder, don't act.

## Open findings — next fire

| Finding | File | Sev | Tier | Status |
|---|---|---|---|---|
| `DatedStatBadge` source-popover keyboard trap — button `onBlur` closes the popover before Tab reaches the "View source" `<a>`, so the source link is mouse-only; secondary: popover is `position:absolute` but wrapper `<span>` lacks `relative`, so it anchors to the wrong ancestor | `components/DatedStatBadge.tsx:165-188` | P2 (a11y) | A | Verified, untracked. Fix: container-scoped dismissal (check `relatedTarget` / click-outside) + add `relative` to wrapper. Existing `__tests__/components/DatedStatBadge.test.tsx` doesn't cover the keyboard path. |

## Founder briefs — held items (need a human decision)

### FB-2026-06-03-01 — Fabricated "social proof" counter (possible misleading-conduct concern)
- **What:** `components/SocialProofCounter.tsx` (≈lines 27-31) renders a synthetic "N investors comparing today"
  figure generated from a sine curve — it is not a real count.
- **Why it's held:** this is not a code bug, it's a product/compliance judgement. On an AFSL-licensed site,
  presenting a fabricated activity figure to consumers risks a misleading-representation / misleading-conduct
  concern (ASIC; ACL s18). Not for an autonomous loop to "fix" either way.
- **Suggested resolution:** founder decides — (a) wire it to a real count, (b) relabel it as illustrative, or
  (c) remove it. Loop will not touch it until decided.

## Live log (most recent first)

### fire 2026-06-03T14:xx — STATUS: PROGRESS · 1 PR open (Tier C, awaiting window) · 2 findings logged
- **Pre-flight:** `origin/main` settled at `d044d4cd7` (#1311 `fix(tco)` merged on green, as expected). The chain of
  `cancelled` ci.yml runs on main is concurrency-supersession from rapid PR merges — not failures; last clean run
  was `330b2b1d8`. Bots **not run this fire** — `bots/journey/ai-journey.cjs` + `/opt/pw-browsers` absent on the
  start branch (`fix/csp-strict-dynamic-isr-outage`); discovery fell back to code-review. (Note: Netlify MCP token
  returns 401 + needs a session restart — flagged to founder separately; live-site bots would run degraded anyway.)
- **Discover:** 3 parallel read-only code-review agents (recent-merge regressions / server+security / client+lib).
  Server/security slice clean (heavily audited). 2 real untracked bugs + 1 founder-brief item found.
- **Fix + PR:** `app/api/marketplace/postback/route.ts` — `conversion_value_cents: z.number()` → `z.unknown()`.
  #1271's hardening made the schema reject string-serialised values (the S2S norm), collapsing the whole body to
  `{}` → spurious `400 click_id is required` → **partner conversions silently dropped** (revenue/attribution loss).
  `z.unknown()` lets the existing `typeof … === "number" ? … : 0` guard restore the documented pre-#1271 contract;
  chosen over `z.coerce.number()` to avoid a NaN-insert path. +2 regression tests. Local gate green
  (tsc ✅ / vitest 15/15 ✅ / eslint ✅ / pre-push ✅). **PR #1313** opened ready. **Tier C** (webhook route) →
  announced in chat, merges after 30-min quiet window unless STOP. Merge handed to the window / next fire.
- **Held:** DatedStatBadge a11y (see Open findings — Tier A, next fire). SocialProofCounter (see FB-2026-06-03-01).
- **Exit:** one mergeable chunk produced (#1313). Next fire continues: complete #1313 merge after window, then take
  the DatedStatBadge a11y fix.
