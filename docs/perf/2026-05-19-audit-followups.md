# Perf-audit follow-ups — items deliberately deferred from PRs 1–5

**Audit date:** 2026-05-19. Source: 4 parallel agent audits (bundle/JS, server data-fetching, images/Lighthouse, caching/CDN/edge/region). Shipped as PRs #943 #944 #945 #946 #947.

This file lists the audit recommendations that were **deferred** out of the 2026-05-19 ship window because each requires multi-hour focused work that couldn't be rushed without sacrificing correctness. Each entry has:
- **What:** the recommended change
- **Why deferred:** the specific risk / cost that made it unsafe to bundle into PRs 1–5
- **Estimated effort:** realistic time to do it well
- **Trigger:** when it should be revisited

---

## 1. `components/Icon.tsx` — sprite refactor for tree-shaking

**What:** Replace the single 712-LOC `<Icon name="..." />` component with either a per-icon SVG sprite or per-icon file exports, so bundlers can drop unused icons from per-route chunks.

**Why deferred:** The component is imported by **364 files** across `app/` and `components/`. Any change to the public API requires updating every call site. The current `<Icon name="x" />` string-keyed lookup is fundamentally untree-shakable — bundlers can't statically prove which icons aren't used.

**Path forward (3 phases):**

1. **Phase 1 (low risk, no consumer changes)** — extract the `icons` object into a separate `lib/icon-paths.ts` data module. `Icon.tsx` imports from there. No bundle savings, but de-couples data from rendering and makes Phase 2 reviewable.
2. **Phase 2 (medium risk, opt-in)** — add per-icon named exports alongside the current API: `export const SproutIcon = () => <Icon name="sprout" />` etc. New code uses the named exports; old code continues to work.
3. **Phase 3 (long tail, mechanical)** — codemod the 364 import sites from `<Icon name="x" />` to `<XIcon />`. Drop the lookup-table component once all sites migrated. **This is the only step that actually reduces bundle size.**

**Estimated effort:** Phase 1 ~30 min; Phase 2 ~1 hour; Phase 3 ~4–6 hours (codemod + per-file verification + spot-check rendering).

**Trigger:** when bundle analysis shows `Icon.tsx` paths are a measurable share of any high-traffic route's JS payload, OR when adding the 60th+ icon (current count: 52).

---

## 2. Homepage client components → RSC + filter islands

**What:** Convert three large homepage client components to React Server Components with small client islands for the interactive bits (tab filters).

**Components in scope:**
- `components/HomeAdvisorsTeaser.tsx` — 257 LOC, `useState<string>` for tab filter
- `components/HomeCompareDeepDive.tsx` — 281 LOC, `useState<string>` for tab filter + 3 `useMemo`
- `components/HomepageComparisonTable.tsx` — 421 LOC, sortable table

**Why deferred:** Each component is structurally a presentational tree wrapped by minimal interactive state. The mechanical conversion is straightforward, but the **visual+a11y semantics** of "render all tabs server-side, toggle visibility with CSS + client island" need careful attention:

- `display: none` toggles need ARIA (`aria-hidden`, `role="tabpanel"`) so screen readers see only the active tab
- CSS-only tab switching loses the React state advantage of memoised computations
- Image lazy-loading semantics change — hidden tabs would download images on first render if not careful
- `usePathname()` consumption (if any) won't work in the RSC portion

Doing all three at once without dedicated visual + a11y QA risks regressing the homepage above-the-fold experience — the highest-traffic surface on the site.

**Path forward:**

1. Convert **HomeAdvisorsTeaser** first (smallest LOC, simplest filter logic). Pattern: parent computes per-type advisor groups server-side, server-renders all groups with `data-tab-key` attributes, tiny client component reads/writes `aria-selected` + toggles `[data-active]` CSS class.
2. Use that pattern as the template for the other two.
3. Each component gets its own PR with: visual screenshot diff, a11y audit (`@axe-core/cli`), Lighthouse run before/after.

**Estimated effort:** ~3–4 hours per component including testing. ~10–12 hours total.

**Trigger:** when the homepage's First Input Delay (INP) > 200ms in real-user metrics, OR when the homepage JS bundle exceeds a measured budget.

**Estimated payoff:** 30–60 kB removed from homepage initial JS payload, 100–300 ms TBT improvement.

---

## 3. Lighthouse hard-fail re-enable

**What:** Flip `.lighthouserc.cwv.json` assertions from `"warn"` → `"error"` and tighten thresholds (LCP 6000→3500ms, TBT 1500→800ms). Rename CI job from `Lighthouse — Core Web Vitals (advisory)` to `Lighthouse — Core Web Vitals (hard-fail)`.

**Why deferred:** PRs 1–4 just landed significant LCP/TBT improvements but we have NO Lighthouse measurements yet on the new baseline. Tightening thresholds before measurement risks flagging runner noise as regressions.

**Path forward:**
1. Wait for 5+ deploys to land with PRs 1–4 in main.
2. Pull median LCP/TBT from those LH runs.
3. Set the new threshold ~20% above measured median (gives noise headroom without being useless).
4. Flip `warn` → `error`. Update CI job name.

**Estimated effort:** 15 min once baseline data is available.

**Trigger:** after 5+ post-perf-PR deploys' worth of Lighthouse runs.

---

## 4. Additional edge runtime migrations

**What:** Move 4–5 more routes from `nodejs` to `edge` runtime. Audit-identified candidates:

| Route | Status | Risk |
|-------|--------|------|
| `app/api/afsl/[number]/route.ts` | Pending | Imports `@/lib/rate-limit-db` → `createAdminClient`; needs verification that nothing deep in the chain uses `node:crypto` |
| `app/api/country-rule-alerts/route.ts` | Pending | Imports `@/lib/country-rule-alerts-server` — needs inspection |
| `app/api/broker-health/route.ts` | Pending | Uses admin client + computation; verify dep chain |
| `app/api/widget/route.ts` | Pending | Anon supabase + HTML/JS string assembly; uses `escapeHtml` — verify edge-safe |
| `app/api/marketplace/allocation/route.ts` | Pending | Imports `@/lib/marketplace/allocation` — verify dep chain |

**Why deferred:** Edge runtime is fail-fast at build time — any `node:crypto`, `node:fs`, or other Node-only API anywhere in the import chain breaks the build. Migrating 5 routes simultaneously risks one breaking the others' deploy. Per-route migration is safer.

**Path forward:** One PR per route. Each PR adds `export const runtime = "edge"` + verifies the build passes + tests the route hits an edge POP via `x-vercel-id` response header.

**Estimated effort:** ~30 min per route × 5 = 2.5 hours total spread across 5 PRs.

**Trigger:** after the `dub1` region change has been verified working in production for a week.

---

## 5. Font subsetting

**What:** Subset all 5 Inter `.woff2` files in `public/fonts/` from full Latin-extended (~115 kB each) to Latin basic (~40 kB each). ~80 kB savings × 5 files = ~375 kB transfer reduction over a fresh visit.

**Why deferred:** Needs external tooling (`glyphhanger`, `fontmin`, or similar) not available in the dev sandbox. Also needs careful verification that no real content uses extended-Latin characters (e.g. accented names in advisor data, currency symbols beyond $ and ¢).

**Path forward:**
1. `npx glyphhanger https://invest-com-au.vercel.app/ --subset=public/fonts/*.woff2 --whitelist=U+0020-007F,U+00A0-00FF` (basic + Latin-1 supplement)
2. Spot-check fonts render properly on advisor profile pages, country pages with non-Latin names (Korea/Japan slugs use Latin transliterations so should be safe), and admin tables.
3. Commit the subsetted `.woff2` files.

**Estimated effort:** ~1 hour including testing.

**Trigger:** when bundle audit shows font load > 200 kB on initial visit.

---

## 6. Favicon compression

**What:** Two `.ico` files in `public/logos/` are oversized:
- `public/logos/crypto-com.ico` — 104 kB (target: < 16 kB)
- `public/logos/plus500.ico` — 88 kB (target: < 16 kB)

**Why deferred:** Needs image-conversion tooling.

**Path forward:** Use `imagemagick` or `sharp` to convert source SVGs (if available) or resize the existing ICOs:
- `convert input.png -define icon:auto-resize=16,32,48 output.ico`
- Or convert to inline SVG component if a source SVG exists.

**Estimated effort:** ~10 min.

**Trigger:** opportunistic — bundle these into the next time someone touches broker logos.

---

## 7. `ui-avatars.com` + `randomuser.me` placeholder elimination

**What:** Replace third-party avatar placeholders with locally-generated SVG initial avatars (similar pattern to `components/BrokerLogo.tsx`'s letter fallback).

**Why deferred:** ~10–15 call sites across `app/find-advisor/page.tsx`, `app/deals/page.tsx`, `components/VerticalPillarPage.tsx`, etc. Each needs the same refactor pattern; doing them all at once without per-site visual verification risks broken avatars on key pages.

**Path forward:**
1. Add a `<LetterAvatar>` component to `components/LetterAvatar.tsx` (basically extract the `LetterFallback` from `BrokerLogo.tsx`).
2. Codemod or manually update each call site.
3. Drop `ui-avatars.com` and `randomuser.me` from `next.config.ts` `images.remotePatterns`.

**Estimated effort:** ~2 hours including spot-check on every page that uses fallback avatars.

**Trigger:** when Vercel image-transform credits become a cost concern, OR when adding the next batch of advisor seed data.

---

## What WAS shipped on 2026-05-19 (for reference)

| PR | Theme | Notable wins |
|----|-------|--------------|
| #943 | Tier S infra/caching | Vercel region `iad1` → `dub1` (~75ms cross-region RTT saved per server query); OG image cache headers; `force-dynamic` removed from 2 truly-public routes + private cache for 3 v1 API routes; `force-static` on robots; image cache TTL 24h → 30d |
| #944 | Tier A server fetching | Wired `lib/cached-data.ts` helpers into homepage + 43 best/[slug] + 5 pillars + broker detail (eliminates O(pages) Supabase round-trips per ISR cycle); parallelised 4 sequential `await isFlagEnabled` in layout (every-page render) |
| #945 | Tier A bundle/scripts | Sentry replay → `lazyLoadIntegration` (~70 kB); PostHog → `requestIdleCallback` defer (189 kB SDK off LCP path); dropped Source_Serif_4 + JetBrains_Mono w800 (~45 kB); 6 layout side-effect comps → `next/dynamic({ ssr: false })`; deleted dead GoogleAnalytics.tsx |
| #946 | Tier A images/LCP | BrokerLogo `priority` on hero of every pillar + best page; removed `priority={idx < 3}` anti-pattern on /articles + /advisors; preconnect for ui-avatars + randomuser |
| #947 | Tier B (small) | `/api/geo` → edge runtime; Cache-Control on `/api/cohort-stats` (was the only edge route without headers) |

Estimated combined effect: **40-60% TTFB reduction on uncached pages, 200–500ms LCP improvement, ~150 kB bundle reduction off the critical path, build-time fetch storm eliminated.**

Real measurement awaits the next few production deploys' Lighthouse runs.
