# R2 Audit — Design-system consistency

## Scope

Static read-only analysis of all `.tsx` files under `app/` and `components/` (excluding `node_modules`). Lens: visual design-system consistency — hardcoded colours, inline-style sprawl, CTA colour chaos, card-pattern drift, typography weight inconsistency, token misuse, and underused shared primitives.

Key greps run:
- `style={{` (inline style count per file)
- `"#[0-9a-fA-F]{6}"` (hardcoded hex literals)
- `rounded-[…]`, `text-[…]`, `gap-[…]` (arbitrary Tailwind escape values)
- `bg-brand`, `text-brand`, `iv2-cta`, `iv2-card`, `iv2-pill`
- Per-colour-family primary-CTA counts (`emerald`, `amber`, `slate-900`, `violet`, `teal`, `blue`)

Tokens defined: `app/globals.css` `@theme` block (ink, coral, sand, vertical accents; **teal is absent from @theme** but used widely via Tailwind utilities).
Primitives available: `components/ui/Button.tsx`, `components/ui/Card.tsx`, `components/ui/Badge.tsx`, globals CSS classes `iv2-cta / iv2-cta-ink / iv2-cta-ghost / iv2-card / iv2-pill / iv2-tag`.

---

## Findings

| # | Severity | file:line | Issue | Recommendation |
|---|----------|-----------|-------|----------------|
| 1 | High | `app/advisor/[slug]/page.tsx:431–583` | **43 inline `style={{…}}` attributes** across three card sections (Services, Certifications, Case Studies). Hardcoded hex `#e5e7eb`, `#fafafa`, `#f0fdfa`, `#99f6e4`, `#f8fafc`, `#7c3aed`, `#94a3b8` etc. None of the colours belong to `@theme` tokens; layout (flex, grid, gap) duplicates Tailwind classes already on adjacent elements. Dark-mode is silently broken here since no `html.dark` override covers raw hex in `style={}`. | Extract the three sections into a shared `<AdvisorSocialProofCard>` component using `iv2-card`, `iv2-pill`, and Tailwind token classes (`teal-600`, `slate-700`). |
| 2 | High | `app/my-learning/page.tsx` (59 inline styles), `app/feed/FeedPageClient.tsx` (46), `app/account/health/page.tsx` (41) | Three high-traffic user-facing pages built almost entirely with `style={{…}}` instead of Tailwind or `iv2-*` classes. Dark mode overrides in `globals.css` cannot reach raw CSS property values set by inline styles. | Migrate to Tailwind utilities + `iv2-card` / `iv2-pill`. At minimum, move all `color:` and `background:` values to CSS variable references or Tailwind token classes so dark mode works. |
| 3 | High | `app/teams/[slug]/referrals/page.tsx` (22 inline styles) + `_components/ReferDialog.tsx` (13 inline styles) + `_components/ReferralActions.tsx` | User-facing teams portal pages styled entirely with `style={{color: "#0f172a", background: "#0ea5e9", border: "1px solid #cbd5e1"}}`. `#0ea5e9` (sky-400) is used as the primary action colour here while the rest of the app uses coral, amber, slate-900, emerald, or violet. | Adopt `iv2-cta` or `Button` primitive; replace raw hex with token classes (`text-slate-900`, `bg-sky-400`). |
| 4 | High | Multiple files | **Six competing "primary" CTA colour families** for the same user intent (click-through / submit): `bg-emerald-600` (101 occurrences non-admin), `bg-slate-900` (562), `bg-violet-600` (114), `bg-teal-600` (28), `bg-blue-600`/`bg-indigo-700` (71), `bg-amber-500` (33, and also in `Button` primitive). Community uses emerald; org-portal uses teal; teams portal uses violet; find-advisor uses amber (`Button`); nav/auth/misc uses slate-900; grants/occupation pages use blue. | Designate one brand action colour (coral, per `@theme` and `iv2-cta`) for primary external-facing CTAs. Use slate-900 for secondary confirmatory actions. Retire ad-hoc emerald/violet/teal/blue from CTA contexts. |
| 5 | High | `components/HomeRouteCards.tsx` (39 inline styles), `HomeCompareDeepDive.tsx` (34), `HomeAdvisorsTeaser.tsx` (31) | Home-section components use extensive inline styles for layout, typography, and colour — including hardcoded hex accent palette (`"#2563eb"`, `"#059669"`, `"#7c3aed"`, `"#f25822"`) stored in a `routes` data object and threaded back into `style={{}}`. The `color-mix()` usage inside inline styles cannot be evaluated correctly in some browsers and breaks tree-shaking. | Move accent values to a `@theme` variable or Tailwind config entry; compose with Tailwind classes instead of inline style objects. |
| 6 | Medium | `components/streak/StreakBadge.tsx:24–36` | `StreakBadge` uses a full inline-style object with hardcoded `#fef3c7` / `#92400e` (amber-100 / amber-800 equivalents) and `#fde68a` border. The `Badge` primitive already has a `warning` variant (`bg-amber-100 text-amber-700`) that covers this pattern. | Replace with `<Badge variant="warning" size="sm">🔥{streak}</Badge>`. |
| 7 | Medium | `app/my-briefs/page.tsx:39–57` | Status badge colours defined as raw hex objects `{ bg: "#d1fae5", text: "#065f46" }` etc., then applied via `style={{}}`. The `Badge` component (`success`, `warning`, `info`) covers all four status states. | Replace hex-object status map with `Badge` variant lookup. |
| 8 | Medium | `components/InvestListingCard.tsx:190,282` | Card border-radius uses `rounded-[14px]` (arbitrary escape). `iv2-card` class uses `border-radius: 14px`; `Card` primitive uses `rounded-2xl` (16 px). Three slightly different radii on functionally equivalent cards creates perceptible inconsistency at scale. | Normalise: either adopt `rounded-xl` (12 px) or `rounded-2xl` (16 px) project-wide, add `--radius-card: 14px` to `@theme`, and reference it via a utility class. |
| 9 | Medium | `app/certificate/[number]/ShareCertificateActions.tsx:87` | LinkedIn share button uses inline Tailwind arbitrary values `bg-[#0A66C2]` and `hover:bg-[#004182]` — LinkedIn's brand hex. These are not theming concerns but they escape Tailwind's purge-safety and show up in the stylesheet as unique 1-use utilities. | Move LinkedIn colors to a CSS custom property (`--color-linkedin: #0A66C2`) in `@theme` and reference via a Tailwind config alias, or isolate in a `<LinkedInShareButton>` component with a comment noting the intentional brand colour. |
| 10 | Medium | `components/design/Atoms.tsx:SponsorChip` | `SponsorChip`'s `"featured"` variant hard-codes `#dbeafe` / `#1d4ed8` / `#bfdbfe` (blue-100 / blue-700 / blue-200) while the other variants use `var(--color-*)` CSS variable references. Inconsistent pattern within the same component. | Replace with `var(--color-blue-100)` / `var(--color-blue-700)` / `var(--color-blue-200)` to match the rest of the function. |
| 11 | Medium | `app/account/health/page.tsx:157,178,200,223,227,231` | `iv2-card` used (correctly) but every card also carries `style={{ padding: 24, marginBottom: 20, … }}`. The `iv2-card` class has no padding, so padding must always be added manually. The `Card` primitive already has `padding="md"` (p-6 = 24 px). The two abstractions serve the same purpose but neither is authoritative. | Pick one: extend `iv2-card` with a padding modifier class (`.iv2-card-body { padding: 1.5rem; }`) or migrate to `<Card padding="md">`. 19 uses of `iv2-card` override its padding inline. |
| 12 | Low | `app/halal-investing/page.tsx` and several long-form content pages | H2 headings mix `font-bold` and `font-extrabold` at `text-2xl` within the same page (halal: all `font-bold`; how-we-verify: all `font-extrabold`; family-office: `font-extrabold`). No documented scale rule; copy-paste diverges page by page. | Document and enforce in CLAUDE.md or a shared CSS class: content H2 = `text-2xl font-bold`, section H2 = `text-2xl font-extrabold`. Apply mechanically across all long-form pages. |
| 13 | Low | `components/ui/Button.tsx`, `components/ui/Card.tsx`, `components/ui/Badge.tsx` | Primitives exist and are well-designed but are imported by only 6 pages (`find-advisor`, 3 quiz steps, and 2 others). Across the app 562+ `bg-slate-900 text-white rounded-lg` button instances, 101 `bg-emerald-600` CTAs, and dozens of manual card divs exist instead. | Add a lint rule (or ESLint plugin comment) to flag bare `bg-*-* text-white rounded-*` button patterns that should use `<Button>` or `iv2-cta`. |
| 14 | Low | `app/teams/[slug]/referrals/page.tsx:231–234` | Status badge colours defined as a raw JS object with 4 hex-pair entries (pending/accepted/declined/expired). Not shared with any other status display. `Badge` component covers all four cases. | Same fix as #7 — use `<Badge variant="warning|success|error|default">`. |
| 15 | Low | `app/globals.css: iv2-tag:177` | `.iv2-tag` has `border: 1px solid #e5e7eb` (raw hex) rather than `border: 1px solid var(--color-ink-100)` which is semantically equivalent. Minor inconsistency but undercuts the CSS variable system. | Change to `border: 1px solid var(--color-ink-100)`. |

---

## Quick wins

1. **StreakBadge → Badge** (F6): one-line swap, removes 14-line inline-style block, fixes dark-mode invisibility.
2. **my-briefs status map → Badge** (F7 + F14): replace two hex-keyed status objects with `Badge` variant lookups — ~20 lines deleted.
3. **SponsorChip `featured` variant** (F10): 3-line find-replace to use `var(--color-blue-*)` — zero visual change, consistent with rest of component.
4. **`iv2-tag` border** (F15): 1-line CSS change in `globals.css`.
5. **LinkedIn hex → CSS variable** (F9): add one line to `globals.css @theme`, update one className string.

---

## Notable (with counts)

- **1,166 `style={{…}}` calls** across non-admin, non-OG-route `.tsx` files (689 in `app/`, 477 in `components/`). Admin pages add another ~518. The inline-style surface is enormous and the root cause of dark-mode gaps.
- **541 hardcoded hex literals** (`"#xxxxxx"`) in non-admin TSX (393 in `app/`, 148 in `components/`). Most correspond to Tailwind tokens already defined in `globals.css @theme` but are not referenced via `var(--color-*)`.
- **6 competing primary CTA colour families**: `slate-900` dominates (562 hits) but coral (`iv2-cta`), amber (`Button` primary), emerald (community), violet (teams portal), teal (org-portal), and blue (grants/occupation pages) all appear as primary-action colours on public-facing pages — no single brand CTA colour is enforced.
- **`components/ui/Button|Card|Badge` adoption rate ≈ 0.5%** of use sites. The primitives exist and are correct; they are simply not used outside the find-advisor wizard and quiz steps.
