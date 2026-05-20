# HANDOFF — PR #1043 CI fix + directory-UX filter unification

Pick this up on a full local env (real `.env`, dev server, Supabase creds). The
session that produced this ran in a cloud sandbox that **could not** run
`npm run build`, start a dev server against live data, or regenerate Supabase
types. Read all of §1 first, then start at §2 STEP 1.

> Retrieval: this doc lives on branch `claude/handoff-directory` (doc-only, no PR
> by design so the audit loop can't auto-merge it). The PR being fixed is **#1043**
> on branch `claude/clear-session-J0Ml0`.

## 1. Orientation
- Repo: `invest-com-au`. Read `CLAUDE.md` (hard rules). Critical gotchas:
  - Node 20+. TS strict + `noUncheckedIndexedAccess`. CI fails on any TS error.
  - `npm run test:coverage` enforces coverage FLOORS (`vitest.config.mts`).
  - `vi.mock()` hoists — wrap factory-referenced vars in `vi.hoisted()`.
  - Pre-push hook runs tsc + rate-limit audit + changed tests; bump
    `NODE_OPTIONS="--max-old-space-size=5120"` if tsc OOMs. Never `--no-verify`.
  - Conventional Commits; agent work = DRAFT PRs.
- Master plan: `docs/plans/DIRECTORY_UX_UNIFICATION.md` ("Still to do" + "Progress").
- `components/directory/` = 11 merged primitives, each with a test in
  `__tests__/components/directory/`.

## 2. PRIMARY TASK — make PR #1043 green
Branch `claude/clear-session-J0Ml0` (draft PR #1043). It migrated `/invest`'s
filter UI (`components/InvestListingsClient.tsx`) onto the primitives:
`<FilterPanel variant="responsive">` (desktop sidebar + mobile bottom-sheet),
`<FacetGroup>` (FIRB/SIV/Wholesale/ESIC), `<RangeSlider>` (min-yield),
`<FilterChips>`. URL params + the filter/sort pipeline were left UNCHANGED. New
test: `__tests__/components/InvestListingsClient.test.tsx`. Verified in the
sandbox: `tsc`, `eslint`, unit tests all green. NOT verified: `npm run build`,
full `test:coverage`.

Three red checks. **New evidence narrows the diagnosis:**

> The "Bundle size diff vs base" bot posted *After* numbers on #1043 (shared
> chunks 12051 KB, +3.7 KB — the 4 new primitive imports). That bot builds the
> PR, so **`npm run build` SUCCEEDS.** Do NOT assume the build is the culprit (an
> earlier draft of this brief did — it was wrong). The
> `Lint·Type-check·Test·Build` failure is in a NON-build step; the
> `Preview smoke test` failure is a separate runtime/infra matter.

### STEP 1 — find the failing step in `Lint·Type-check·Test·Build`
Run the steps in CI order with the placeholder env (`.github/workflows/ci.yml:42`)
and STOP at the first failure:

```bash
git checkout claude/clear-session-J0Ml0 && npm ci
export NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co \
  NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder SUPABASE_SERVICE_ROLE_KEY=placeholder \
  RESEND_API_KEY=placeholder STRIPE_SECRET_KEY=placeholder \
  STRIPE_WEBHOOK_SECRET=placeholder NEXT_PUBLIC_SITE_URL=https://invest.com.au \
  CRON_SECRET=placeholder
npx tsc --noEmit
npm run lint
node scripts/check-jsonld-coverage.mjs
npm run test:coverage          # MOST LIKELY culprit — full suite + coverage FLOORS
npm run audit:rate-limits -- --strict
npm run build                  # confirmed green via the bundle bot; run to be sure
node scripts/bundle-size-budget.mjs --budget-kb 12000
```

Most likely `test:coverage`: either (a) a test in the full suite fails — could be
pre-existing, see STEP 2 — or (b) a coverage FLOOR. For (b), extend
`__tests__/components/InvestListingsClient.test.tsx` to cover the new
`InvestFilterFields` component (the `<RangeSlider>` only renders when a kind is
selected, so add a case with searchParams `?kind=fund`; the sandbox test only
covered the empty state).

### STEP 1b — the `Preview smoke test` failure
Build passes, so this is NOT "no preview deployed". Read the job log:
- If it lists specific failing paths and `/invest` is among them → my change has a
  runtime bug (renders in build/SSR but errors at runtime against real Supabase).
  Repro: `npm run build && npm start` with a real `.env`, open `/invest`; the new
  primitives are client components, so check hydration/console errors too.
- If the failing paths are ones I didn't touch (`/articles`, `/brokers`, …), or
  every path is 401/timeout → pre-existing infra (Vercel protection / deploy
  timing), not #1043.

### STEP 2 — confirm mine vs pre-existing
```bash
git stash; git checkout main; npm ci; npm run build   # same env as STEP 1
```
If `main` ALSO fails to build → pre-existing repo break, not PR #1043; note it on
the PR and don't chase it inside this PR. If `main` builds clean → #1043
introduced it; fix on the branch, re-run STEP 1's full block, commit, push.

### STEP 3 — "Supabase types drift" (separate, chronic — do NOT bundle here)
`ci.yml:352` diffs `lib/database.types.ts` against `supabase gen types` from the
LIVE project. The repo's quality bot reports **346 live tables missing from
migrations** — this fails on EVERY PR and is not caused by #1043. The real fix is
a SEPARATE PR: with creds set, run `npm run db:types` (confirm the script in
`package.json`; it's referenced at `ci.yml:379`) and commit the regenerated
`lib/database.types.ts`. First confirm via `docs/audits/MERGE_AUTHORIZATION.md`
whether this check even blocks merge — history shows the team merges through it.

### STEP 4 — visually QA /invest (the sandbox could not)
`npm run dev`, open `/invest`. Check: the desktop two-column sidebar layout; the
mobile bottom-sheet (the "Filters" button is now `md:hidden`); facet toggles
write URL params; the yield slider (select a kind first); chip removal. The card
grid breakpoints (`md:grid-cols-2 lg:grid-cols-3`) may want a tweak now the
results column is narrower beside the sidebar.

## 3. THE FAN-OUT (after #1043 is green) — parallel worktree agents, disjoint files
Mirror /invest (read `InvestListingsClient.tsx` as the reference). Each stream =
own branch + own draft PR; they touch different files so `git worktree` agents
can run concurrently without conflict.

### 3a. /advisors — Session 5b — `app/advisors/AdvisorsClient.tsx` (~1574 lines)
- DO NOT change the 300ms debounced URL sync (`updateURL`, ~L348-373) — that's
  Session 7, a separate PR.
- DO NOT flatten the SM-01 grouped-specialty accordion (~L834,
  `ADVISOR_SPECIALTY_CATEGORIES`).
- Swap: type-filter buttons (~L729, `TYPE_FILTERS`) → `<FacetGroup>` bound to the
  `typeFilters` Set; `minRating` select (~L765) → `<RangeSlider>` (0–5, presets);
  wrap the `filtersOpen` inline panel (~L700-887) in
  `<FilterPanel variant="responsive">` with the "Filters" button mobile-only.
- ADD a `<FilterChips>` strip (none exists today) from the active filter states.
- Keep state/fee/firm/language as native `<select>`.
- BONUS (QW4): make `providerTypeCounts` (~L523) recompute from the filtered set.
- Add `__tests__/components/AdvisorsClient.test.tsx`; run dev-server click-through.

### 3b. /compare — Session 12 — `app/compare/{page,super/page,insurance/page,etfs/page}.tsx`
- Replace each bespoke banner stack with `<DirectoryBanners surface="compare" />`
  (`components/foreign-investment/DirectoryBanners.tsx`). Add `<ResultCount>`
  above the comparison table; KEEP the table itself.

### 3c. Later
- Session 7 — migrate `AdvisorsClient` to URL-first state (conflicts with 3a, do
  AFTER 3a lands).
- Session 5.5 — live per-facet `counts` on `<FacetGroup>` (both pages) +
  `<SearchInput>` typeahead.

## 4. Primitive APIs
- `FilterPanel`  { open, onClose, onClearAll?, activeCount?, resultCount?,
  heading?, variant?: "responsive" | "drawer" | "inline", children }
- `FacetGroup`   { label, options: {value,label}[], selected: Set,
  onChange: (Set)=>void, counts?, hideZeroCounts?, layout?: "rows"|"grid" }  // multi-select
- `RangeSlider`  { label, min, max, step?, value, onChange, formatValue?,
  presets?: {label,value}[], suffix? }  // single-handle; single-select facets stay native <select>
- `FilterChips`  { chips: {label,onClear}[], onClearAll?, prefix? }  // renders null when empty

## 5. Pre-PR checklist (all doable locally)
`tsc` → `lint` → `test:coverage` → `npm run build` (placeholder env) →
`npm run dev` click-through → Conventional commit → `push -u` → DRAFT PR.

## 6. Conventions
- One branch per PR; descriptive names (e.g. `claude/directory-advisors-5b`).
- Merge tiers: `docs/audits/MERGE_AUTHORIZATION.md` (this filter work is Tier A/B
  page-UI).
- An independent audit-remediation loop also pushes branches and can force-update
  `main` — expect churn; rebase if a branch goes stale.
