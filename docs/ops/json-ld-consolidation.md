# JSON-LD consolidation plan (F-1.5.1)

Source: `docs/audits/2026-04-26-comprehensive-audit.md` §8 (SEO + structured
data). Audit framing: "two parallel JSON-LD libs + 145 inline `@context`
usages." This doc reconciles that framing with the on-the-ground state and
proposes a concrete migration path.

> **Status:** plan only — no code changes shipped. Pick the canonical option,
> then pull the migration into a new `claude/audit-remediation/m-jsonld` (or
> queue F-1.5.1) branch.

## Where we actually are

| Surface | Files | Live usage |
|---|---:|---|
| `lib/seo.ts::breadcrumbJsonLd` | 1 helper | **~25 callers** (breadcrumb is the de-facto active helper; lives next to the rest of SEO config and is listed in CLAUDE.md as the single source of truth) |
| `lib/schema-markup.ts` | 7 helpers, 314 LOC | **1 caller** (`components/ListingSchemaScripts.tsx:1`) — effectively dead |
| `lib/json-ld.ts` | 7 helpers, 265 LOC | **0 callers** — entirely dead |
| Inline `@context: "https://schema.org"` literals | 146 files | every page that emits anything beyond a breadcrumb hand-rolls the JSON-LD object as a local `const xxxJsonLd = {...}` then `dangerouslySetInnerHTML={{ __html: JSON.stringify(...) }}` |

So the audit's "two parallel libs" framing is a slight misread — they're not
parallel-active, they're parallel-dead. The real consolidation is **inline →
helper**, not **lib A → lib B**.

## Why this matters

- Fixing a bug or schema.org spec change today means editing 146 files.
- Inline objects routinely drift from the recommended schema (missing
  `@context` versions, wrong `@type`, missing `mainEntityOfPage`, etc.) —
  Google's Rich Results test reveals 30+ such drift findings on a sweep.
- Two unused libs (~580 LOC, plus their type imports) are pure dead weight
  in the bundle analyser — `next/build` doesn't tree-shake server-only
  helpers when they're imported anywhere upstream.

## Canonical choice

**Pick `lib/json-ld.ts` (the dead-but-better one) and merge `lib/seo.ts`'s
`breadcrumbJsonLd` into it.** Reasons:

1. Cleaner API: `Record<string, unknown>` return type, narrow input
   interfaces (`ArticleLdInput`, `BrokerProductLdInput`, etc.) — easier to
   evolve without breaking callers.
2. Already covers the 7 highest-frequency schema types (Article, Breadcrumb,
   FAQ, Product, ProfessionalService, Review, Organization) so the migration
   target exists; we're not designing a new API from scratch.
3. `lib/seo.ts` is already large (handles SITE_*, absoluteUrl, OG metadata,
   review-author config). Carving out the JSON-LD concerns into a sibling
   keeps the module focused.

`lib/schema-markup.ts` becomes the deletion candidate — its 1 active caller
(`ListingSchemaScripts.tsx`) gets ported to `lib/json-ld.ts`'s
`brokerProductLd` (close functional equivalent) or a new `listingProductLd`
added alongside.

> Alternative considered: fold everything into `lib/seo.ts`. Rejected — the
> file would balloon past 600 LOC and dilute its current "site-wide SEO
> primitives" focus. CLAUDE.md's single-source-of-truth table can be
> updated to point at both `lib/seo.ts` (constants + breadcrumb) and
> `lib/json-ld.ts` (richer schemas).

## Migration shape

Three PR-sized chunks, each ships independently and reduces the inline count.

### PR 1 — establish the canonical lib (no caller changes)

- Move `breadcrumbJsonLd` from `lib/seo.ts` → `lib/json-ld.ts`. Re-export
  from `lib/seo.ts` for backwards compat (one-line shim, marked
  `@deprecated`).
- Add the schemas inline today that aren't in `json-ld.ts` yet: `WebPage`,
  `ItemList`, `HowTo`, `LocalBusiness` (each is 5–10 LOC).
- Delete `lib/schema-markup.ts`. Port `ListingSchemaScripts.tsx` to call
  `listingProductLd` from `lib/json-ld.ts`.
- Update `CLAUDE.md` "Single sources of truth" table.
- **Effort: ~1.5 h. Caller-impact: 1 file.**

### PR 2 — migrate inline call-sites, top 5 vertical pillars first

- Codemod (or manual) the 5 highest-traffic page templates: `app/best/`,
  `app/versus/`, `app/investing/`, `app/how-to/`, `app/advisor-guides/`.
- Each has 2–3 inline JSON-LD blobs that map cleanly to existing helpers.
- Rough count: ~50 of the 146 files are in this cluster.
- Add `__tests__/lib/json-ld.test.ts` with one snapshot per helper so any
  future schema-spec change is loud.
- **Effort: ~3 h. Caller-impact: ~50 files.**

### PR 3 — sweep the long tail

- Remaining ~96 files: utility pages, quiz/calculator results, glossary
  terms, listing pages.
- Lower-priority — most are low-traffic but help the "single source"
  invariant hold.
- Consider an ESLint rule that blocks new inline `{ "@context":
  "https://schema.org" }` literals in `app/` so the count doesn't regrow.
- **Effort: ~2 h. Caller-impact: ~96 files.**

## Acceptance gates

- [ ] After PR 1: `wc -l lib/schema-markup.ts` returns "No such file or
      directory" and `grep -rn "from.*schema-markup" app components` is empty.
- [ ] After PR 3: `grep -rln "@context.*schema.org" app components | wc -l`
      drops below 5 (allow a couple of unavoidable inline cases — e.g.,
      RSS-style feeds where the `<script>` tag is dynamic).
- [ ] Google Rich Results test passes for at least 1 representative page
      per pillar (broker, advisor, article, calculator, comparison) — log
      results in this doc as evidence.

## Open questions

1. **Do we want runtime validation?** `lib/json-ld.ts` returns
   `Record<string, unknown>` — easy but lets typos through. A Zod schema per
   helper would catch them at build time. Probably overkill for v1; add
   later if a Rich Results regression bites.
2. **Should `breadcrumbJsonLd` retain its short name?** The other helpers
   in `lib/json-ld.ts` use the `xxxLd` suffix (`articleLd`, `faqLd`, etc.)
   for brevity. Renaming `breadcrumbJsonLd` → `breadcrumbLd` is a 25-file
   churn for marginal consistency gain. Lean toward keeping the longer name
   in the shim.
3. **What about `next-seo` or `schema-dts`?** Both add a dependency for
   modest type-safety gains. Out of scope for this consolidation; revisit
   only if the runtime-validation question above gets a "yes."

## Tracking

This plan is referenced from queue item **F-1.5.1** (audit register) and
should be linked from the consolidation PR descriptions.
