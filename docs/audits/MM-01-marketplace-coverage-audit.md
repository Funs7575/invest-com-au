# MM-AUDIT — Investment Listings Marketplace Coverage Audit

**Stream:** MM — Marketplace expansion  
**Phase:** 1 (coverage audit — prerequisite for MM-V02..V09)  
**Authored:** 2026-05-12 (iter 376)  
**Source plan:** `docs/audits/MM-marketplace-expansion-plan.md`

This document is the reference that every MM Phase 2/3 iteration reads at the
top. Do not delete; append updates when new verticals ship.

---

## 1. Current content pages under `/invest/`

37 route directories exist. Categorised below.

### 1a. Verticals with both a content hub AND a listings index page

| Route slug | Form vertical value | Listing vertical kind |
|------------|--------------------|-----------------------|
| `buy-business` | `business` | marketplace |
| `commercial-property` | `commercial_property` | marketplace |
| `farmland` | `farmland` | marketplace |
| `franchise` | `franchise` | marketplace |
| `mining` | `mining` | commodity |
| `renewable-energy` | `energy` | marketplace |
| `startups` | `startup` | capital-markets |
| `pre-ipo` | `pre_ipo` | capital-markets |
| `alternatives` | — | — |
| `private-credit` | — | — |
| `infrastructure` | — | — |

> **Note on `alternatives`, `private-credit`, `infrastructure`:** listings pages
> exist (sitemap-registered) but there is **no corresponding form vertical** in
> `ListingSubmitForm.tsx`. Listings are reachable by direct URL but cannot be
> submitted by sellers. This is a gap — either add the form option or remove the
> listings page.

### 1b. Verticals in `lib/listing-verticals.ts` with content hub but NO listings index page

| Route slug | Form vertical value | Gap |
|------------|-------------------|-----|
| `digital-infrastructure` | `digital-infrastructure` | MM-V01 content page shipped (f024bc2) but `/invest/digital-infrastructure/listings/` not yet created. |
| `funds` | `fund` | Form option exists; no `/invest/funds/listings/` — fund listings submitted via form but not discoverable via vertical browse. |
| `oil-gas` | — | Commodity hub; no form option (subsumed under "mining"). |
| `uranium` | — | Commodity hub; no form option. |
| `lithium` | — | Commodity hub; no form option. |
| `hydrogen` | — | Commodity hub; no form option. |
| `gold` | — | Commodity hub; no form option. |

### 1c. Content-only pages (educational, no listing vertical at all)

These pages are purely informational; no seller can submit a listing for them.
They represent **potential new verticals** per the MM expansion plan.

| Route slug | MM expansion plan item | Priority |
|------------|----------------------|----------|
| `alternatives` | Add form option + fix listings page | High |
| `private-credit` | Add form option + fix listings page | High |
| `private-equity` | MM-V02 candidate | High |
| `reits` | MM-V02 candidate | High |
| `bonds` | MM-V03 candidate | Medium |
| `hybrid-securities` | MM-V03 candidate | Medium |
| `income-assets` | MM-V04 candidate | Medium |
| `managed-funds` | — (MIS-gated, AFSL risk) | Low |
| `royalties` | MM-V05 candidate | Medium |
| `ipos` | Covered by `pre-ipo` vertical | — |
| `ipo-calendar` | Utility page, not a vertical | — |
| `smsf` | Vertical (SMSF-specific listings) | Medium |
| `commodities` | Hub redirecting to sub-pages | — |
| `crypto-staking` | MM-V06 candidate | Low |
| `dividend-investing` | Educational only | — |
| `forex` | Educational only | — |
| `options-trading` | Educational only | — |

---

## 2. Form vertical values vs route slugs — mismatch map

The `ListingSubmitForm.tsx` VERTICALS array uses different values from the
route slugs. When the form submits, `investment_listings.vertical` gets the
**form value**, but the discovery pages use the **route slug**. The
`InvestListingsClient` and `fetchListingsByVertical()` must map between them.

| Form value (DB column) | Route slug | Status |
|------------------------|-----------|--------|
| `business` | `buy-business` | ✓ mapped in `investment-listings-query.ts` |
| `commercial_property` | `commercial-property` | ✓ mapped |
| `farmland` | `farmland` | ✓ exact match |
| `mining` | `mining` | ✓ exact match |
| `energy` | `renewable-energy` | ✓ mapped |
| `franchise` | `franchise` | ✓ exact match |
| `fund` | `funds` | ✓ mapped |
| `startup` | `startups` | ✓ mapped |
| `pre_ipo` | `pre-ipo` | ✓ mapped |
| `digital-infrastructure` | `digital-infrastructure` | ✓ exact match (added MM-V01) |

> When adding a new vertical: if the form value differs from the route slug,
> add the mapping to `lib/investment-listings-query.ts`'s vertical normaliser.
> Check `fetchListingsByVertical()` and `countListingsByVertical()` — both must
> handle the new form value.

---

## 3. Touch points required to add a new vertical (checklist)

Every new vertical needs ALL of these:

- [ ] **`lib/listing-verticals.ts`** — add `ListingVertical` entry with `slug`, `label`, `description`, `icon`, `kind`, `order`
- [ ] **`app/invest/list/ListingSubmitForm.tsx`** — add entry to `VERTICALS` array with `value`, `label`, `icon`, `desc`
- [ ] **`app/invest/<slug>/listings/page.tsx`** — create listing index page (copy from `app/invest/mining/listings/page.tsx`, replace vertical value + copy)
- [ ] **`app/sitemap.ts`** — add `/invest/<slug>` to the appropriate priority set (line ~39–55); add `/invest/<slug>/listings` to line ~52
- [ ] **`lib/investment-listings-query.ts`** — add form-value→slug mapping if they differ (check `VERTICAL_SLUG_MAP` or equivalent)
- [ ] **`app/invest/<slug>/page.tsx`** — ensure content page exists with JSON-LD (BreadcrumbList + FAQPage), `generateMetadata`, and ISR `revalidate = 3600`
- [ ] **Breadcrumb JSON-LD** — verify `breadcrumbJsonLd()` is called with the correct hierarchy on the listings page

Optional but recommended:
- [ ] **`components/SubCategoryNav.tsx`** — add sub-categories for the vertical (drives the filter tabs on the listings page)
- [ ] **Supabase migration** — if the new vertical requires new `sub_category` values validated by DB constraint, add migration

---

## 4. Verticals missing listings pages — priority backlog

These are the highest-priority gaps where a form option exists but discovery
is broken (sellers can submit but buyers can't find):

| Item | Gap | Effort | Priority |
|------|-----|--------|----------|
| `digital-infrastructure` (MM-V01b) | No `/invest/digital-infrastructure/listings/` | 1 iter | **P0 — form accepts submissions, no discovery** |
| `funds` | No `/invest/funds/listings/` | 1 iter | **P0 — same** |
| `alternatives` | No form option (listings page exists) | 1 iter | P1 |
| `private-credit` | No form option (listings page exists) | 1 iter | P1 |
| `infrastructure` | No form option (listings page exists) | 1 iter | P1 |

---

## 5. New verticals from MM expansion plan (MM-V02..V09)

| Item | Vertical | Sub-categories | AFSL gate? |
|------|----------|---------------|------------|
| MM-V02 | Public & Social Infrastructure | Transport, Water, Health, Education, Social Housing, SDA, Telco, Defence | Defence: wholesale-only |
| MM-V03 | Carbon & Environmental Markets | ACCUs, Voluntary credits, Biodiversity, Carbon farming, CCS | ACCUs may be MIS — gate wholesale |
| MM-V04 | Private Equity | VC, PE buyout, Growth equity, Family office co-invest, Secondary PE | Wholesale-only (s708 gate from pre-ipo) |
| MM-V05 | Real Estate Debt & REITS | Commercial REITS, Industrial, Healthcare, Retail, Mortgage trusts, Development debt | — |
| MM-V06 | Royalties | Mining royalties, Music/media, Pharma/patent, Software revenue share, Agriculture | — |
| MM-V07 | Carbon Agriculture & Nature | Blue carbon, Soil carbon, Reforestation, Biodiversity stewardship | Same as V03 gateway |
| MM-V08 | Infrastructure Debt | Senior secured infra debt, Project finance bonds, Regulated asset base | Wholesale-only |
| MM-V09 | Startup vertical expansion | Sector pages, round-instrument explainers, ESIC tax explainer, 12+ seed listings | — (deepens existing startups) |

MM-V09 is the prerequisite for the SP (Startup Portal) stream.

---

## 6. Sitemap coverage status

Current sitemap (`app/sitemap.ts` lines 39–56) registers these invest paths:

**Medium priority (line 26):** `/invest/mining`, `/invest/buy-business`, `/invest/farmland`, `/invest/commercial-property`, `/invest/renewable-energy`, `/invest/startups`

**Dynamic listing pages (line 52–56):**
`/invest/buy-business/listings`, `/invest/mining/listings`, `/invest/farmland/listings`, `/invest/commercial-property/listings`, `/invest/franchise/listings`, `/invest/renewable-energy/listings`, `/invest/startups/listings`, `/invest/alternatives/listings`, `/invest/private-credit/listings`, `/invest/infrastructure/listings`

**Gaps:**
- `/invest/digital-infrastructure` — not in medium priority (should be)
- `/invest/digital-infrastructure/listings` — not in sitemap (page doesn't exist yet)
- `/invest/funds/listings` — not in sitemap (page doesn't exist yet)
- `/invest/pre-ipo` — in line-39 dynamic list but not medium priority

---

## 7. Idempotency / safety

This iteration only adds a documentation file. No source code changed.
No migration. No regression risk.

## 8. Rollback

Delete `docs/audits/MM-01-marketplace-coverage-audit.md`. No other state changed.
