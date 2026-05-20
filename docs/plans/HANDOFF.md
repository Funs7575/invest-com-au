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

Three red checks, likely only **two** distinct causes.

### STEP 1 — reproduce the build (almost certainly the root cause of 2 checks)
`Lint·Type-check·Test·Build` AND `Preview smoke test (critical URLs)` most likely
BOTH stem from `npm run build` failing: if the production build breaks, the CI
build step fails AND Vercel's preview never deploys, so the smoke job fails with
"No Vercel preview URL found within 6 min." Reproduce with CI's exact placeholder
env (`.github/workflows/ci.yml:42`):

```bash
git checkout claude/clear-session-J0Ml0 && npm ci
export NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co \
  NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder SUPABASE_SERVICE_ROLE_KEY=placeholder \
  RESEND_API_KEY=placeholder STRIPE_SECRET_KEY=placeholder \
  STRIPE_WEBHOOK_SECRET=placeholder NEXT_PUBLIC_SITE_URL=https://invest.com.au \
  CRON_SECRET=placeholder
npm run build      # <-- run this FIRST. Read the error.
```

**Strong lead:** `/invest` is the FIRST built route to actually import
`FilterPanel`/`FacetGroup`/`RangeSlider`/`FilterChips` — those primitives were
built in #957 but were not yet consumed by any rendered page. So a build-time /
SSR issue inside one of those primitives (or in the new `InvestFilterFields`
component at the bottom of `InvestListingsClient.tsx`) would surface HERE for the
first time. If the build errors, the stack trace names the file — fix there.

If `npm run build` is GREEN locally, the failing step is elsewhere — run the job
in CI order and stop at the first failure:

```bash
npx tsc --noEmit && npm run lint && node scripts/check-jsonld-coverage.mjs \
  && npm run test:coverage && npm run audit:rate-limits -- --strict \
  && node scripts/bundle-size-budget.mjs --budget-kb 12000
```

If it's a coverage-floor drop, extend the new test to cover `InvestFilterFields`.
Note the `<RangeSlider>` only renders when a listing kind is selected, so a test
needs searchParams like `?kind=fund` (the sandbox test only covered the empty
state).

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
