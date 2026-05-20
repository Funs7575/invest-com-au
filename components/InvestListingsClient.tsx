"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { InvestmentListing, ListingKind } from "@/lib/types";
import { categoryForListing } from "@/lib/listing-url";
import {
  ALL_LISTING_KINDS,
  TICKET_BUCKETS,
  ticketBucketByKey,
  INVESTOR_TYPES,
  type InvestorType,
  deriveListingKind,
  listingKindMeta,
  filterSpecForKind,
  formatListingPrice,
  freshnessSignal,
} from "@/lib/listing-kind";
import InvestListingCard from "@/components/InvestListingCard";
import ListingCompareBar from "@/components/invest/ListingCompareBar";
import SaveSearchButton from "@/components/invest/SaveSearchButton";
import Icon from "@/components/Icon";
import TabBar from "@/components/directory/TabBar";
import SearchInput from "@/components/directory/SearchInput";
import SortDropdown from "@/components/directory/SortDropdown";
import FilterPanel from "@/components/directory/FilterPanel";
import FacetGroup from "@/components/directory/FacetGroup";
import RangeSlider from "@/components/directory/RangeSlider";
import FilterChips from "@/components/directory/FilterChips";

// ─── Props ───────────────────────────────────────────────────────────
export interface InvestListingsClientProps {
  listings: InvestmentListing[];
  categories: { slug: string; label: string }[];
  initialCategory?: string;
  initialSubcategory?: string;
  /** Vertical-listings pages pass this to lock the category and hide
   *  the global category tab bar. */
  lockedCategory?: string;
  pageTitle?: string;
  pageSubtitle?: string;
  /** Optional: visitor's intent country (set on FIRB / foreign-investment
   *  funnels). When set, the FIRB badge on cards becomes meaningful and
   *  the "FIRB eligible only" toggle is auto-surfaced in filters. */
  intentCountry?: string | null;
  /** Pre-computed smart-match scores per listing id (Wave 3). Cards render
   *  a green "X% match" pill when present. */
  matchScores?: Record<number, number>;
  /** Pre-computed advisor opt-in counts per listing id (Wave 3). Cards
   *  render an emerald "X advisors can assess this" pill when > 0. */
  advisorOptInCounts?: Record<number, number>;
  /** Set of slugs that already have an approved claim. Cards NOT in this
   *  set render a small "Are you the owner?" link. (Wave 3) */
  claimedSlugs?: Set<string>;
}

// ─── Australian states ───────────────────────────────────────────────
const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"] as const;

// ─── Sort options ────────────────────────────────────────────────────
type SortKey = "newest" | "price-asc" | "price-desc" | "popular" | "closing-soon";
const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "popular", label: "Most viewed" },
  { value: "closing-soon", label: "Closing soon" },
];

// ─── View modes ──────────────────────────────────────────────────────
type ViewMode = "grid" | "list" | "table";
const VIEW_MODES: { value: ViewMode; label: string; icon: string }[] = [
  { value: "grid", label: "Grid", icon: "grid" },
  { value: "list", label: "List", icon: "list" },
  { value: "table", label: "Table", icon: "table" },
];

function resolveTicketBucketKey(raw: string | null): string {
  if (!raw) return "";
  // Legacy numeric index form (?price=3) → translate to new key
  const asNum = Number(raw);
  if (!Number.isNaN(asNum) && asNum >= 0 && asNum < TICKET_BUCKETS.length) {
    return TICKET_BUCKETS[asNum].key;
  }
  // New key form (?price=100k-1m)
  return TICKET_BUCKETS.some((b) => b.key === raw) ? raw : "";
}

function prettyCategory(slug: string, categories: { slug: string; label: string }[]): string {
  const match = categories.find((c) => c.slug === slug);
  if (match) return match.label;
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function InvestListingsClient({
  listings,
  categories,
  initialCategory,
  initialSubcategory,
  lockedCategory,
  pageTitle,
  pageSubtitle,
  intentCountry,
  matchScores,
  advisorOptInCounts,
  claimedSlugs,
}: InvestListingsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ── State from URL (single source of truth — keeps Back/Forward + sharing working) ──
  const activeCategory = lockedCategory
    ? lockedCategory
    : (searchParams.get("category") ?? initialCategory ?? "all");
  const activeSubcategory = searchParams.get("sub") ?? initialSubcategory ?? "";
  const activeState = searchParams.get("state") ?? "";
  const activeTicket = resolveTicketBucketKey(searchParams.get("price"));
  const activeSort = (searchParams.get("sort") ?? "newest") as SortKey;
  const activeView = (searchParams.get("view") ?? "grid") as ViewMode;

  // Kind filter — `?kind=fund` narrows to one listing kind. Multi-kind
  // selection encoded as comma-separated values.
  const activeKindsRaw = searchParams.get("kind") ?? "";
  const activeKinds = useMemo(
    () => new Set(activeKindsRaw.split(",").filter(Boolean) as ListingKind[]),
    [activeKindsRaw],
  );

  // Universal advanced filters
  const activeInvestorType = (searchParams.get("investor") ?? "") as InvestorType;
  const activeFirbOnly = searchParams.get("firb") === "eligible";
  const activeSivOnly = searchParams.get("siv") === "complying";
  const activeWholesaleOnly = searchParams.get("wholesale") === "true";
  const activeFreshness = searchParams.get("fresh") ?? ""; // 'new_this_week' | 'closing_soon'
  const activeFeaturedOnly = searchParams.get("featured") === "true";
  const activeMinYield = searchParams.get("min_yield") ?? ""; // numeric % string
  const activeEsicOnly = searchParams.get("esic") === "true";

  // Free-text search (URL-backed so back-button works + share-able)
  const initialQuery = searchParams.get("q") ?? "";
  const [searchInput, setSearchInput] = useState(initialQuery);
  useEffect(() => { setSearchInput(initialQuery); }, [initialQuery]);
  const activeQuery = initialQuery.toLowerCase();

  // Filter drawer open state — kept local, never persisted
  const [drawerOpen, setDrawerOpen] = useState(false);

  // ── URL update helper ──
  const setParams = useCallback(
    (updates: Record<string, string>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v) next.set(k, v);
        else next.delete(k);
      }
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const clearAllFilters = useCallback(() => {
    const next = new URLSearchParams(searchParams.toString());
    for (const key of [
      "category", "sub", "state", "price", "sort", "q", "firb", "siv",
      "wholesale", "investor", "kind", "fresh", "featured", "min_yield", "esic",
    ]) {
      next.delete(key);
    }
    // View mode is a display preference, NOT a filter — preserve it.
    setSearchInput("");
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }, [router, pathname, searchParams]);

  const toggleKind = useCallback((k: ListingKind) => {
    const next = new Set(activeKinds);
    if (next.has(k)) next.delete(k); else next.add(k);
    setParams({ kind: Array.from(next).join(",") });
  }, [activeKinds, setParams]);

  const submitSearch = useCallback((q: string) => {
    setParams({ q: q.trim() });
  }, [setParams]);

  // ── Derived sub-categories for the active category ──
  const subCategories = useMemo(() => {
    if (activeCategory === "all") return [];
    const subs = new Set<string>();
    for (const l of listings) {
      if (categoryForListing(l) === activeCategory && l.sub_category) {
        subs.add(l.sub_category);
      }
    }
    return Array.from(subs).sort();
  }, [listings, activeCategory]);

  // ── Per-kind counts for the segmented control ──
  const kindCounts = useMemo(() => {
    const counts: Record<string, number> = { all: listings.length };
    for (const l of listings) {
      const k = deriveListingKind(l);
      counts[k] = (counts[k] ?? 0) + 1;
    }
    return counts;
  }, [listings]);

  // ── Per-category counts ──
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: listings.length };
    for (const l of listings) {
      const c = categoryForListing(l);
      if (c) counts[c] = (counts[c] ?? 0) + 1;
    }
    return counts;
  }, [listings]);

  // ── The main filter + sort pipeline ──
  const filtered = useMemo(() => {
    let result = listings;

    if (activeKinds.size > 0) {
      result = result.filter((l) => activeKinds.has(deriveListingKind(l)));
    }

    if (activeCategory !== "all") {
      result = result.filter((l) => categoryForListing(l) === activeCategory);
    }

    if (activeSubcategory) {
      result = result.filter((l) => l.sub_category === activeSubcategory);
    }

    if (activeState) {
      result = result.filter((l) => l.location_state === activeState);
    }

    if (activeTicket) {
      const range = ticketBucketByKey(activeTicket);
      result = result.filter((l) => {
        const km = (l.key_metrics ?? {}) as Record<string, unknown>;
        const minInvest = km["min_investment_aud"] ?? km["min_commit_aud"] ?? km["min_investment"];
        const minInvestCents = typeof minInvest === "number" ? minInvest * 100 : undefined;
        const ticket = l.asking_price_cents ?? minInvestCents;
        if (ticket == null) return false;
        return ticket >= range.min && ticket < range.max;
      });
    }

    if (activeQuery) {
      result = result.filter((l) => {
        const km = (l.key_metrics ?? {}) as Record<string, unknown>;
        const haystack = [
          l.title, l.description, l.location_city, l.location_state,
          l.industry, l.sub_category,
          String(km["asx_ticker"] ?? ""),
          String(km["brand"] ?? ""),
          String(km["commodity"] ?? ""),
        ]
          .filter((x): x is string => typeof x === "string")
          .join(" ")
          .toLowerCase();
        return haystack.includes(activeQuery);
      });
    }

    if (activeFirbOnly) result = result.filter((l) => l.firb_eligible === true);
    if (activeSivOnly) result = result.filter((l) => l.siv_complying === true);

    if (activeWholesaleOnly) {
      result = result.filter((l) => {
        const km = (l.key_metrics ?? {}) as Record<string, unknown>;
        return km["wholesale_only"] === true || km["s708_required"] === true || km["accredited_only"] === true;
      });
    }

    if (activeInvestorType === "retail") {
      result = result.filter((l) => {
        const km = (l.key_metrics ?? {}) as Record<string, unknown>;
        const wholesaleOnly = km["wholesale_only"] === true || km["s708_required"] === true || km["accredited_only"] === true;
        return !wholesaleOnly || km["open_to_retail"] === true;
      });
    }
    if (activeInvestorType === "siv") {
      result = result.filter((l) => l.siv_complying === true);
    }

    if (activeFreshness === "new_this_week") {
      result = result.filter((l) => freshnessSignal(l) === "new_this_week");
    }
    if (activeFreshness === "closing_soon") {
      result = result.filter((l) => freshnessSignal(l) === "closing_soon");
    }

    if (activeFeaturedOnly) {
      result = result.filter((l) => l.listing_type === "featured" || l.listing_type === "premium");
    }

    if (activeMinYield) {
      const minYield = Number(activeMinYield);
      if (!Number.isNaN(minYield)) {
        result = result.filter((l) => {
          const km = (l.key_metrics ?? {}) as Record<string, unknown>;
          const candidates = [
            km["distribution_yield"], km["target_yield_pct"], km["target_yield_pa"],
            km["dividend_yield"], km["yield_percent"], km["target_irr_percent"],
            km["target_irr"], km["historical_return_pa"], km["return_5yr_pa"],
            km["target_return_pa"], km["estimated_return_percent"],
          ];
          for (const c of candidates) {
            if (typeof c === "number" && c >= minYield) return true;
            if (typeof c === "string") {
              const n = Number(c.replace(/[^\d.]/g, ""));
              if (!Number.isNaN(n) && n >= minYield) return true;
            }
          }
          return false;
        });
      }
    }

    if (activeEsicOnly) {
      result = result.filter((l) => {
        const km = (l.key_metrics ?? {}) as Record<string, unknown>;
        return km["esic_eligible"] === true;
      });
    }

    // Sort
    const sorted = [...result];
    switch (activeSort) {
      case "newest":
        sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
        break;
      case "price-asc":
        sorted.sort((a, b) => (a.asking_price_cents ?? Infinity) - (b.asking_price_cents ?? Infinity));
        break;
      case "price-desc":
        sorted.sort((a, b) => (b.asking_price_cents ?? 0) - (a.asking_price_cents ?? 0));
        break;
      case "popular":
        sorted.sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
        break;
      case "closing-soon":
        sorted.sort((a, b) => {
          const ax = a.expires_at ? new Date(a.expires_at).getTime() : Infinity;
          const bx = b.expires_at ? new Date(b.expires_at).getTime() : Infinity;
          return ax - bx;
        });
        break;
    }

    return sorted;
  }, [
    listings, activeKinds, activeCategory, activeSubcategory, activeState,
    activeTicket, activeQuery, activeFirbOnly, activeSivOnly, activeWholesaleOnly,
    activeInvestorType, activeFreshness, activeFeaturedOnly, activeMinYield,
    activeEsicOnly, activeSort,
  ]);

  // ── Active-filter chips ──
  const activeChips: Array<{ label: string; onClear: () => void }> = [];
  if (!lockedCategory && activeCategory !== "all") {
    activeChips.push({
      label: `Category: ${prettyCategory(activeCategory, categories)}`,
      onClear: () => setParams({ category: "", sub: "" }),
    });
  }
  if (activeKinds.size > 0) {
    Array.from(activeKinds).forEach((k) => {
      const meta = listingKindMeta(k);
      activeChips.push({ label: meta.label, onClear: () => toggleKind(k) });
    });
  }
  if (activeSubcategory) {
    activeChips.push({ label: `Sub: ${activeSubcategory.replace(/_/g, " ")}`, onClear: () => setParams({ sub: "" }) });
  }
  if (activeState) {
    activeChips.push({ label: `State: ${activeState}`, onClear: () => setParams({ state: "" }) });
  }
  if (activeTicket) {
    activeChips.push({ label: `Ticket: ${ticketBucketByKey(activeTicket).label}`, onClear: () => setParams({ price: "" }) });
  }
  if (activeInvestorType) {
    activeChips.push({
      label: INVESTOR_TYPES.find((t) => t.value === activeInvestorType)?.label ?? activeInvestorType,
      onClear: () => setParams({ investor: "" }),
    });
  }
  if (activeFirbOnly) activeChips.push({ label: "FIRB-eligible", onClear: () => setParams({ firb: "" }) });
  if (activeSivOnly) activeChips.push({ label: "SIV-complying", onClear: () => setParams({ siv: "" }) });
  if (activeWholesaleOnly) activeChips.push({ label: "Wholesale only", onClear: () => setParams({ wholesale: "" }) });
  if (activeFreshness) {
    activeChips.push({
      label: activeFreshness === "new_this_week" ? "New this week" : "Closing soon",
      onClear: () => setParams({ fresh: "" }),
    });
  }
  if (activeFeaturedOnly) activeChips.push({ label: "Featured only", onClear: () => setParams({ featured: "" }) });
  if (activeMinYield) activeChips.push({ label: `Yield ≥ ${activeMinYield}%`, onClear: () => setParams({ min_yield: "" }) });
  if (activeEsicOnly) activeChips.push({ label: "ESIC-eligible", onClear: () => setParams({ esic: "" }) });
  if (activeQuery) {
    activeChips.push({
      label: `"${initialQuery}"`,
      onClear: () => { setSearchInput(""); setParams({ q: "" }); },
    });
  }

  // Drive kind-specific filters off the active narrowed kind.
  const narrowedKind: ListingKind | null = activeKinds.size === 1 ? Array.from(activeKinds)[0] : null;
  const kindSpec = filterSpecForKind(narrowedKind);

  const tabs = useMemo(
    () => [{ slug: "all", label: "All" }, ...categories],
    [categories],
  );

  const lockedCategoryLabel = lockedCategory ? prettyCategory(lockedCategory, categories) : null;

  return (
    <div>
      {/* ── Page-header band (vertical-listings pages only) ────── */}
      {pageTitle && (
        <div className="bg-white border-b border-slate-100 py-6 md:py-8">
          <div className="container-custom">
            {lockedCategory && lockedCategoryLabel && (
              <div className="flex items-center gap-2 mb-3 text-xs flex-wrap">
                <Link href="/invest" className="text-slate-500 hover:text-slate-900 font-semibold inline-flex items-center gap-1 transition-colors">
                  <span aria-hidden="true">←</span> Browse all listings
                </Link>
                <span className="text-slate-300" aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-semibold ring-1 bg-amber-50 text-amber-700 ring-amber-200">
                  <Icon name="filter" size={11} />
                  Filtered to {lockedCategoryLabel}
                </span>
              </div>
            )}
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-slate-900 leading-tight">{pageTitle}</h1>
            {pageSubtitle && (
              <p className="text-sm md:text-base text-slate-600 leading-relaxed mt-2 max-w-3xl">{pageSubtitle}</p>
            )}
          </div>
        </div>
      )}

      {/* ── Single sticky toolbar (replaces the old two-bar stack) ── */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="container-custom py-3 space-y-2.5">
          {/* Row 1: search · filters · sort · view-mode toggle */}
          <div className="flex gap-2 items-center">
            <SearchInput
              id="listings-search"
              value={searchInput}
              onChange={setSearchInput}
              onSubmit={submitSearch}
              placeholder="Search title, sector, ticker, suburb…"
              ariaLabel="Search listings"
            />

            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className={`md:hidden shrink-0 inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition-all ${
                activeChips.length > 0
                  ? "bg-amber-50 border-amber-300 text-amber-700"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Icon name="sliders" size={16} />
              <span className="hidden sm:inline">Filters</span>
              {activeChips.length > 0 && (
                <span className="bg-amber-600 text-white text-[0.6rem] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {activeChips.length}
                </span>
              )}
            </button>

            <SortDropdown
              options={SORT_OPTIONS}
              value={activeSort}
              onChange={(v) => setParams({ sort: v === "newest" ? "" : v })}
            />

            <div className="shrink-0 hidden sm:inline-flex rounded-lg border border-slate-200 bg-white p-0.5" role="tablist" aria-label="View mode">
              {VIEW_MODES.map((v) => (
                <button
                  key={v.value}
                  type="button"
                  role="tab"
                  aria-selected={activeView === v.value}
                  aria-label={`${v.label} view`}
                  onClick={() => setParams({ view: v.value === "grid" ? "" : v.value })}
                  className={`inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-500 transition-all ${
                    activeView === v.value ? "bg-slate-100 text-slate-900" : "hover:bg-slate-50"
                  }`}
                >
                  <Icon name={v.icon} size={14} />
                </button>
              ))}
            </div>

            {/* Save current filter set as a named saved-search */}
            <SaveSearchButton
              activeChipsCount={activeChips.length}
              filters={Object.fromEntries(searchParams.entries())}
            />
          </div>

          {/* Row 2: kind segmented control */}
          {!lockedCategory && (
            <div className="overflow-x-auto scrollbar-hide -mx-1 px-1">
              <div className="flex items-center gap-1.5 min-w-max">
                <button
                  type="button"
                  onClick={() => setParams({ kind: "" })}
                  aria-pressed={activeKinds.size === 0}
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-all inline-flex items-center gap-1.5 ${
                    activeKinds.size === 0 ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  All kinds
                  <span className={`text-[0.6rem] font-bold px-1.5 py-0.5 rounded ${
                    activeKinds.size === 0 ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                  }`}>
                    {kindCounts.all ?? 0}
                  </span>
                </button>
                {ALL_LISTING_KINDS
                  .filter((k) => (kindCounts[k] ?? 0) > 0)
                  .map((k) => {
                    const meta = listingKindMeta(k);
                    const count = kindCounts[k] ?? 0;
                    const isActive = activeKinds.has(k);
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => toggleKind(k)}
                        aria-pressed={isActive}
                        className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-all inline-flex items-center gap-1.5 ${
                          isActive
                            ? `${meta.accent.badge} shadow-sm`
                            : `bg-white border border-slate-200 text-slate-600 hover:bg-slate-50`
                        }`}
                        title={meta.blurb}
                      >
                        <Icon name={meta.icon} size={11} />
                        {meta.label}
                        <span className={`text-[0.6rem] font-bold px-1.5 py-0.5 rounded ${
                          isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Row 3: category chips (secondary narrow by sector) */}
          {!lockedCategory && (
            <TabBar
              ariaLabel="Category"
              variant="chip"
              value={activeCategory}
              onChange={(id) => setParams({ category: id === "all" ? "" : id, sub: "" })}
              alwaysShow="all"
              tabs={tabs.map((tab) => ({
                id: tab.slug,
                label: tab.label,
                count: tab.slug === "all" ? undefined : (categoryCounts[tab.slug] ?? 0),
              }))}
            />
          )}

          {/* Active-filter chips */}
          <FilterChips chips={activeChips} onClearAll={clearAllFilters} />
        </div>
      </div>

      {/* ── Results + filter sidebar ──────────────────────────────── */}
      <div className="container-custom py-5 md:py-8">
        <div className="md:grid md:grid-cols-[260px_minmax(0,1fr)] md:gap-6 lg:gap-8">
          {/* Filters — inline sidebar on desktop, bottom-sheet drawer on mobile */}
          <aside className="md:self-start">
            <FilterPanel
              open={drawerOpen}
              onClose={() => setDrawerOpen(false)}
              onClearAll={clearAllFilters}
              activeCount={activeChips.length}
              resultCount={filtered.length}
            >
              <InvestFilterFields
                activeState={activeState}
                activeTicket={activeTicket}
                activeInvestorType={activeInvestorType}
                activeFirbOnly={activeFirbOnly}
                activeSivOnly={activeSivOnly}
                activeWholesaleOnly={activeWholesaleOnly}
                activeFreshness={activeFreshness}
                activeFeaturedOnly={activeFeaturedOnly}
                activeMinYield={activeMinYield}
                activeEsicOnly={activeEsicOnly}
                kindSpec={kindSpec}
                intentCountry={intentCountry ?? null}
                setParams={setParams}
              />
            </FilterPanel>
          </aside>

          {/* Results column */}
          <div className="min-w-0">
            {subCategories.length > 0 && (
              <div className="mb-5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Narrow by sub-type</p>
                <div className="flex flex-wrap gap-1.5">
                  {subCategories.map((sub) => {
                    const isActive = sub === activeSubcategory;
                    return (
                      <button
                        key={sub}
                        onClick={() => setParams({ sub: isActive ? "" : sub })}
                        aria-pressed={isActive}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors capitalize ${
                          isActive ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {sub.replace(/_/g, " ")}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <p className="text-xs text-slate-500 mb-4">
              <span className="font-bold text-slate-700">{filtered.length}</span> listing{filtered.length !== 1 ? "s" : ""} found
              {activeChips.length > 0 && (
                <span className="text-slate-400"> · from {listings.length} total</span>
              )}
            </p>

            {filtered.length === 0 ? (
              <EmptyState onClearAll={clearAllFilters} hasFilters={activeChips.length > 0} />
            ) : activeView === "table" ? (
              <TableView listings={filtered} showFirbBadge={Boolean(intentCountry) || activeFirbOnly} />
            ) : activeView === "list" ? (
              <div className="flex flex-col gap-3">
                {filtered.map((l) => (
                  <InvestListingCard
                    key={l.id}
                    listing={l}
                    variant="list"
                    showFirbBadge={Boolean(intentCountry) || activeFirbOnly}
                    matchScore={matchScores?.[l.id] ?? null}
                    advisorOptInCount={advisorOptInCounts?.[l.id] ?? 0}
                    showClaimBadge={claimedSlugs ? !claimedSlugs.has(l.slug) && (l.listing_kind === "fund" || l.listing_kind === "physical_asset" || l.listing_kind === "listed_security") : false}
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filtered.map((l) => (
                  <InvestListingCard
                    key={l.id}
                    listing={l}
                    showFirbBadge={Boolean(intentCountry) || activeFirbOnly}
                    matchScore={matchScores?.[l.id] ?? null}
                    advisorOptInCount={advisorOptInCounts?.[l.id] ?? 0}
                    showClaimBadge={claimedSlugs ? !claimedSlugs.has(l.slug) && (l.listing_kind === "fund" || l.listing_kind === "physical_asset" || l.listing_kind === "listed_security") : false}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sticky compare bar — renders nothing when shortlist is empty */}
      <ListingCompareBar />
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────
function EmptyState({ onClearAll, hasFilters }: { onClearAll: () => void; hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-4xl mb-3" aria-hidden="true">🔍</div>
      <h3 className="text-lg font-bold text-slate-800 mb-1">
        {hasFilters ? "No listings match your filters" : "No listings yet"}
      </h3>
      <p className="text-sm text-slate-500 max-w-sm mb-5">
        {hasFilters
          ? "Try widening the search, choosing a different category, or clearing one of the active filters."
          : "Check back soon — new opportunities are added weekly."}
      </p>
      {hasFilters && (
        <button
          type="button"
          onClick={onClearAll}
          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm px-5 py-2.5 transition-colors"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}

// ─── Table view ───────────────────────────────────────────────────────
function TableView({ listings, showFirbBadge }: { listings: InvestmentListing[]; showFirbBadge: boolean }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
          <tr>
            <th className="text-left px-4 py-2.5 font-bold">Listing</th>
            <th className="text-left px-3 py-2.5 font-bold">Kind</th>
            <th className="text-left px-3 py-2.5 font-bold">Sector</th>
            <th className="text-left px-3 py-2.5 font-bold">Location</th>
            <th className="text-right px-3 py-2.5 font-bold">Price</th>
            <th className="text-left px-3 py-2.5 font-bold">Flags</th>
            <th className="px-3 py-2.5"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {listings.map((l) => {
            const kind = deriveListingKind(l);
            const meta = listingKindMeta(kind);
            const price = formatListingPrice(l);
            const km = (l.key_metrics ?? {}) as Record<string, unknown>;
            const wholesaleOnly = km["wholesale_only"] === true || km["s708_required"] === true || km["accredited_only"] === true;
            return (
              <tr key={l.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/invest/listings/${l.slug}`} className="font-bold text-slate-900 hover:text-amber-700 line-clamp-1">
                    {l.title}
                  </Link>
                  {l.industry && <div className="text-[0.62rem] text-slate-500 mt-0.5">{l.industry}</div>}
                </td>
                <td className="px-3 py-3">
                  <span className={`inline-flex items-center gap-1 ${meta.accent.badgeSubtle} text-[0.6rem] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border`}>
                    <Icon name={meta.icon} size={9} />
                    {meta.label}
                  </span>
                </td>
                <td className="px-3 py-3 text-xs text-slate-600 capitalize">{l.vertical.replace(/[-_]/g, " ")}</td>
                <td className="px-3 py-3 text-xs text-slate-600">
                  {l.location_state ?? "—"}{l.location_city ? ` · ${l.location_city}` : ""}
                </td>
                <td className="px-3 py-3 text-right">
                  {price ? (
                    <div>
                      <div className="text-[0.55rem] text-slate-400 uppercase">{price.label}</div>
                      <div className="text-xs font-bold text-slate-900">{price.value}</div>
                    </div>
                  ) : <span className="text-slate-300">—</span>}
                </td>
                <td className="px-3 py-3">
                  <div className="flex gap-1 flex-wrap">
                    {showFirbBadge && l.firb_eligible && <span className="bg-blue-100 text-blue-700 text-[0.55rem] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded">FIRB</span>}
                    {l.siv_complying && <span className="bg-emerald-100 text-emerald-700 text-[0.55rem] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded">SIV</span>}
                    {wholesaleOnly && <span className="bg-rose-100 text-rose-700 text-[0.55rem] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded">Wholesale</span>}
                  </div>
                </td>
                <td className="px-3 py-3 text-right">
                  <Link href={`/invest/listings/${l.slug}`} className="text-xs font-bold text-amber-700 hover:text-amber-900 inline-flex items-center gap-0.5">
                    View
                    <Icon name="chevron-right" size={11} />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Filter fields (rendered inside <FilterPanel>) ────────────────────
interface InvestFilterFieldsProps {
  activeState: string;
  activeTicket: string;
  activeInvestorType: InvestorType;
  activeFirbOnly: boolean;
  activeSivOnly: boolean;
  activeWholesaleOnly: boolean;
  activeFreshness: string;
  activeFeaturedOnly: boolean;
  activeMinYield: string;
  activeEsicOnly: boolean;
  kindSpec: ReturnType<typeof filterSpecForKind>;
  intentCountry: string | null;
  setParams: (updates: Record<string, string>) => void;
}

const YIELD_PRESETS = [
  { label: "Any", value: 0 },
  { label: "3%+", value: 3 },
  { label: "5%+", value: 5 },
  { label: "8%+", value: 8 },
  { label: "12%+", value: 12 },
] as const;

function InvestFilterFields({
  activeState, activeTicket, activeInvestorType,
  activeFirbOnly, activeSivOnly, activeWholesaleOnly,
  activeFreshness, activeFeaturedOnly, activeMinYield, activeEsicOnly,
  kindSpec, intentCountry, setParams,
}: InvestFilterFieldsProps) {
  const complianceOptions = [
    { value: "firb", label: "FIRB-eligible" },
    { value: "siv", label: "SIV-complying" },
    { value: "wholesale", label: "Wholesale only" },
    ...(kindSpec.showEsicToggle ? [{ value: "esic", label: "ESIC-eligible" }] : []),
  ];
  const complianceSelected = new Set<string>();
  if (activeFirbOnly) complianceSelected.add("firb");
  if (activeSivOnly) complianceSelected.add("siv");
  if (activeWholesaleOnly) complianceSelected.add("wholesale");
  if (activeEsicOnly) complianceSelected.add("esic");
  const minYieldValue = Number(activeMinYield) || 0;

  return (
    <div className="space-y-5">
          <Section title="Location">
            <select
              value={activeState}
              onChange={(e) => setParams({ state: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option value="">All states</option>
              {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Section>

          <Section title="Ticket size">
            <div className="grid grid-cols-3 gap-1.5">
              {TICKET_BUCKETS.map((b) => (
                <button
                  key={b.key || "any"}
                  type="button"
                  onClick={() => setParams({ price: b.key })}
                  aria-pressed={activeTicket === b.key}
                  className={`text-[11px] font-semibold rounded-lg px-2 py-1.5 transition-colors ${
                    activeTicket === b.key
                      ? "bg-amber-500 text-white shadow-sm"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </Section>

          <Section title="Investor type">
            <select
              value={activeInvestorType}
              onChange={(e) => setParams({ investor: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {INVESTOR_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <p className="text-[10px] text-slate-500 mt-1.5 leading-snug">
              Narrows out listings restricted to a category you don&apos;t qualify for. Doesn&apos;t verify status — that happens at enquiry.
            </p>
          </Section>

          <div>
            <FacetGroup
              label="Compliance & structure"
              options={complianceOptions}
              selected={complianceSelected}
              onChange={(next) =>
                setParams({
                  firb: next.has("firb") ? "eligible" : "",
                  siv: next.has("siv") ? "complying" : "",
                  wholesale: next.has("wholesale") ? "true" : "",
                  ...(kindSpec.showEsicToggle ? { esic: next.has("esic") ? "true" : "" } : {}),
                })
              }
            />
            <p className="text-[10px] text-slate-500 mt-1.5 leading-snug">
              {intentCountry ? "FIRB-eligible recommended — your visit comes via a foreign-investment page. " : ""}
              SIV = $5M+ across complying assets. Wholesale = s708 / sophisticated-investor only.
            </p>
          </div>

          {kindSpec.showYield && (
            <div>
              <RangeSlider
                label="Minimum yield / return"
                min={0}
                max={15}
                step={1}
                value={minYieldValue}
                onChange={(v) => setParams({ min_yield: v === 0 ? "" : String(v) })}
                formatValue={(v) => (v === 0 ? "Any" : `${v}%`)}
                presets={YIELD_PRESETS}
              />
              <p className="text-[10px] text-slate-500 mt-1.5 leading-snug">
                Matches any of: distribution yield, dividend yield, target IRR, historical return, target return.
              </p>
            </div>
          )}

          <Section title="Listing status">
            <select
              value={activeFreshness}
              onChange={(e) => setParams({ fresh: e.target.value })}
              aria-label="Listing freshness"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option value="">Any status</option>
              <option value="new_this_week">New this week</option>
              <option value="closing_soon">Closing soon</option>
            </select>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer mt-2.5">
              <input
                type="checkbox"
                checked={activeFeaturedOnly}
                onChange={(e) => setParams({ featured: e.target.checked ? "true" : "" })}
                className="accent-amber-500 w-4 h-4 shrink-0"
              />
              Featured / Premium only
            </label>
          </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-2">{title}</h3>
      {children}
    </section>
  );
}
