"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { InvestmentListing } from "@/lib/types";
import { categoryForListing } from "@/lib/listing-url";
import InvestListingCard from "@/components/InvestListingCard";

// ─── Props ───────────────────────────────────────────────────────────
export interface InvestListingsClientProps {
  listings: InvestmentListing[];
  categories: { slug: string; label: string }[];
  initialCategory?: string;
  initialSubcategory?: string;
  /**
   * When set, the filter is locked to this category and the
   * global category tab bar is hidden. Used on every
   * /invest/[vertical]/listings page to prevent a ?category=
   * URL param bleeding in from other pages and collapsing the
   * result set to zero.
   */
  lockedCategory?: string;
  /**
   * Optional page title rendered above filters. Required on
   * vertical listings pages per Phase 1D spec.
   */
  pageTitle?: string;
  /**
   * Optional page subtitle / lead paragraph.
   */
  pageSubtitle?: string;
}

// ─── Category colors (pill styling) ─────────────────────────────────
const CATEGORY_COLORS: Record<
  string,
  { bg: string; text: string; ring: string }
> = {
  all: { bg: "bg-slate-100", text: "text-slate-700", ring: "ring-slate-300" },
  "buy-business": { bg: "bg-blue-100", text: "text-blue-700", ring: "ring-blue-300" },
  mining: { bg: "bg-amber-100", text: "text-amber-700", ring: "ring-amber-300" },
  farmland: { bg: "bg-green-100", text: "text-green-700", ring: "ring-green-300" },
  "commercial-property": { bg: "bg-slate-100", text: "text-slate-700", ring: "ring-slate-400" },
  franchise: { bg: "bg-purple-100", text: "text-purple-700", ring: "ring-purple-300" },
  "renewable-energy": { bg: "bg-emerald-100", text: "text-emerald-700", ring: "ring-emerald-300" },
  startups: { bg: "bg-indigo-100", text: "text-indigo-700", ring: "ring-indigo-300" },
  alternatives: { bg: "bg-rose-100", text: "text-rose-700", ring: "ring-rose-300" },
  "private-credit": { bg: "bg-teal-100", text: "text-teal-700", ring: "ring-teal-300" },
  infrastructure: { bg: "bg-cyan-100", text: "text-cyan-700", ring: "ring-cyan-300" },
  funds: { bg: "bg-violet-100", text: "text-violet-700", ring: "ring-violet-300" },
};

// ─── Australian states ───────────────────────────────────────────────
const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"] as const;

// ─── Price ranges ────────────────────────────────────────────────────
// URL-friendly keys so `?price=500k-1m` is human readable. Older index
// params (`?price=3`) remain supported as a fallback for inbound links.
const PRICE_RANGES = [
  { key: "", label: "Any price", min: 0, max: Infinity },
  { key: "under-100k", label: "Under $100k", min: 0, max: 10_000_000 },
  { key: "100k-500k", label: "$100k – $500k", min: 10_000_000, max: 50_000_000 },
  { key: "500k-1m", label: "$500k – $1M", min: 50_000_000, max: 100_000_000 },
  { key: "1m-5m", label: "$1M – $5M", min: 100_000_000, max: 500_000_000 },
  { key: "5m-plus", label: "$5M+", min: 500_000_000, max: Infinity },
] as const;

// ─── Sort options ────────────────────────────────────────────────────
type SortKey = "newest" | "price-asc" | "price-desc";
const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
];

/** Resolve the current price range index from the URL param, accepting
 *  both the new key form (`?price=500k-1m`) and the legacy numeric
 *  form (`?price=3`). Returns 0 (any) for anything unrecognised. */
function resolvePriceIdx(raw: string | null): number {
  if (!raw) return 0;
  const asNum = Number(raw);
  if (!Number.isNaN(asNum) && asNum >= 0 && asNum < PRICE_RANGES.length) return asNum;
  const idx = PRICE_RANGES.findIndex((r) => r.key === raw);
  return idx >= 0 ? idx : 0;
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
}: InvestListingsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // When a vertical listings page passes lockedCategory, that value
  // wins unconditionally — a ?category= URL param from another page
  // must not bleed in. Otherwise fall back to the URL search param,
  // then the initial prop, then 'all'.
  const activeCategory = lockedCategory
    ? lockedCategory
    : (searchParams.get("category") ?? initialCategory ?? "all");
  const activeSubcategory = searchParams.get("sub") ?? initialSubcategory ?? "";
  const activeState = searchParams.get("state") ?? "";
  const activePriceIdx = resolvePriceIdx(searchParams.get("price"));
  const activeSort = (searchParams.get("sort") ?? "newest") as SortKey;
  // FIRB-eligibility filter — typically auto-applied for users who came
  // through a /foreign-investment/<country> page (and therefore have an
  // intent-country cookie). Leaves all listings visible by default for
  // domestic users.
  const activeFirbOnly = searchParams.get("firb") === "eligible";

  // Keyword search is a separate, local state rather than a URL param
  // so typing doesn't spam history entries. Submitting (Enter or
  // natural debounce via filter) applies it to the grid.
  const initialQuery = searchParams.get("q") ?? "";
  const [searchInput, setSearchInput] = useState(initialQuery);
  const activeQuery = initialQuery.toLowerCase();

  // Build new URLSearchParams and push
  const setParam = useCallback(
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

  const clearAll = useCallback(() => {
    const next = new URLSearchParams(searchParams.toString());
    for (const key of ["category", "sub", "state", "price", "sort", "q", "firb"]) {
      next.delete(key);
    }
    if (lockedCategory) next.delete("category");
    setSearchInput("");
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }, [router, pathname, searchParams, lockedCategory]);

  const submitSearch = useCallback(
    (q: string) => {
      setParam({ q: q.trim() });
    },
    [setParam],
  );

  // Derive unique sub_categories for the active category
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

  // ── Filter + sort ──
  const filtered = useMemo(() => {
    let result = listings;

    if (activeCategory !== "all") {
      result = result.filter((l) => categoryForListing(l) === activeCategory);
    }

    if (activeSubcategory) {
      result = result.filter((l) => l.sub_category === activeSubcategory);
    }

    if (activeState) {
      result = result.filter((l) => l.location_state === activeState);
    }

    if (activePriceIdx > 0 && activePriceIdx < PRICE_RANGES.length) {
      const range = PRICE_RANGES[activePriceIdx];
      result = result.filter((l) => {
        const p = l.asking_price_cents;
        if (p == null) return false;
        return p >= range.min && p < range.max;
      });
    }

    if (activeQuery) {
      result = result.filter((l) => {
        const haystack = [
          l.title,
          l.description,
          l.location_city,
          l.location_state,
          l.industry,
          l.sub_category,
        ]
          .filter((x): x is string => typeof x === "string")
          .join(" ")
          .toLowerCase();
        return haystack.includes(activeQuery);
      });
    }

    if (activeFirbOnly) {
      result = result.filter((l) => l.firb_eligible === true);
    }

    const sorted = [...result];
    if (activeSort === "newest") {
      sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
    } else if (activeSort === "price-asc") {
      sorted.sort(
        (a, b) => (a.asking_price_cents ?? 0) - (b.asking_price_cents ?? 0),
      );
    } else {
      sorted.sort(
        (a, b) => (b.asking_price_cents ?? 0) - (a.asking_price_cents ?? 0),
      );
    }

    return sorted;
  }, [
    listings,
    activeCategory,
    activeSubcategory,
    activeState,
    activePriceIdx,
    activeSort,
    activeQuery,
    activeFirbOnly,
  ]);

  // Build a list of active-filter chips so the reader can see exactly
  // what's filtering the results + remove any one with a click.
  const activeChips: Array<{ label: string; onClear: () => void }> = [];
  if (!lockedCategory && activeCategory !== "all") {
    activeChips.push({
      label: `Category: ${prettyCategory(activeCategory, categories)}`,
      onClear: () => setParam({ category: "", sub: "" }),
    });
  }
  if (activeSubcategory) {
    activeChips.push({
      label: `Sub: ${activeSubcategory.replace(/_/g, " ")}`,
      onClear: () => setParam({ sub: "" }),
    });
  }
  if (activeState) {
    activeChips.push({
      label: `State: ${activeState}`,
      onClear: () => setParam({ state: "" }),
    });
  }
  if (activePriceIdx > 0) {
    activeChips.push({
      label: `Price: ${PRICE_RANGES[activePriceIdx].label}`,
      onClear: () => setParam({ price: "" }),
    });
  }
  if (activeQuery) {
    activeChips.push({
      label: `"${initialQuery}"`,
      onClear: () => {
        setSearchInput("");
        setParam({ q: "" });
      },
    });
  }
  if (activeFirbOnly) {
    activeChips.push({
      label: "FIRB-eligible only",
      onClear: () => setParam({ firb: "" }),
    });
  }

  // All category tabs (prepend "All")
  const tabs = useMemo(
    () => [{ slug: "all", label: "All" }, ...categories],
    [categories],
  );

  return (
    <div>
      {pageTitle && (
        <div className="bg-white border-b border-slate-100 py-6 md:py-8">
          <div className="container-custom">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-slate-900 leading-tight">
              {pageTitle}
            </h1>
            {pageSubtitle && (
              <p className="text-sm md:text-base text-slate-600 leading-relaxed mt-2 max-w-3xl">
                {pageSubtitle}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Sticky category tab bar — global page only ── */}
      {!lockedCategory && (
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200">
          <div className="container-custom overflow-x-auto scrollbar-hide">
            <div className="flex gap-1.5 py-2.5 min-w-max">
              {tabs.map((tab) => {
                const isActive = tab.slug === activeCategory;
                const colors = CATEGORY_COLORS[tab.slug] ?? CATEGORY_COLORS.all;
                return (
                  <button
                    key={tab.slug}
                    onClick={() =>
                      setParam({ category: tab.slug === "all" ? "" : tab.slug, sub: "" })
                    }
                    className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                      isActive
                        ? `${colors.bg} ${colors.text} ring-1 ${colors.ring}`
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Sticky filter toolbar — visible as user scrolls. ──
           Separate from the category bar (when present) so the selects
           are always reachable without scrolling back up. */}
      <div
        className={`sticky z-10 bg-white/95 backdrop-blur border-b border-slate-200 ${
          lockedCategory ? "top-0" : "top-[48px]"
        }`}
      >
        <div className="container-custom py-3">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            {/* Search */}
            <form
              role="search"
              className="flex-1 min-w-0"
              onSubmit={(e) => {
                e.preventDefault();
                submitSearch(searchInput);
              }}
            >
              <label htmlFor="listings-search" className="sr-only">
                Search listings
              </label>
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z"
                  />
                </svg>
                <input
                  id="listings-search"
                  type="search"
                  inputMode="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onBlur={() => {
                    if (searchInput.trim() !== initialQuery) {
                      submitSearch(searchInput);
                    }
                  }}
                  placeholder="Search by keyword, city, industry…"
                  className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-9 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput("");
                      submitSearch("");
                    }}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-[11px] font-bold"
                  >
                    ×
                  </button>
                )}
              </div>
            </form>

            {/* Filter dropdowns — each with a visible inline label so
                users always know what the current value means. */}
            <div className="flex flex-wrap items-center gap-2">
              <LabeledSelect
                id="filter-state"
                label="State"
                value={activeState}
                onChange={(v) => setParam({ state: v })}
                options={[
                  { value: "", label: "All states" },
                  ...STATES.map((s) => ({ value: s, label: s })),
                ]}
              />
              <LabeledSelect
                id="filter-price"
                label="Price"
                value={PRICE_RANGES[activePriceIdx].key}
                onChange={(v) => setParam({ price: v })}
                options={PRICE_RANGES.map((r) => ({ value: r.key, label: r.label }))}
              />
              <LabeledSelect
                id="filter-sort"
                label="Sort"
                value={activeSort === "newest" ? "" : activeSort}
                onChange={(v) => setParam({ sort: v })}
                options={SORT_OPTIONS.map((o) => ({
                  value: o.value === "newest" ? "" : o.value,
                  label: o.label,
                }))}
              />
            </div>
          </div>

          {/* Active-filter chips row — only shown when something is
              filtering so the page isn't visually noisy otherwise. */}
          {activeChips.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Filtering:
              </span>
              {activeChips.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  onClick={c.onClear}
                  className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-100"
                >
                  {c.label}
                  <span className="text-amber-600" aria-hidden="true">×</span>
                  <span className="sr-only">Remove {c.label} filter</span>
                </button>
              ))}
              <button
                type="button"
                onClick={clearAll}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-700 underline underline-offset-2"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="container-custom py-5 md:py-8">
        {/* Sub-category pills — only meaningful when a single category
            is selected. Collapsed into a compact chip row with a
            visible label so readers know what the pills narrow. */}
        {subCategories.length > 0 && (
          <div className="mb-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
              Narrow by type
            </p>
            <div className="flex flex-wrap gap-1.5">
              {subCategories.map((sub) => {
                const isActive = sub === activeSubcategory;
                return (
                  <button
                    key={sub}
                    onClick={() => setParam({ sub: isActive ? "" : sub })}
                    aria-pressed={isActive}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors capitalize ${
                      isActive
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {sub.replace(/_/g, " ")}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Results count */}
        <p className="text-xs text-slate-500 mb-4">
          {filtered.length} listing{filtered.length !== 1 ? "s" : ""} found
        </p>

        {/* Grid of cards */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-4xl mb-3" aria-hidden="true">🔍</div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">
              No listings match your filters
            </h3>
            <p className="text-sm text-slate-500 max-w-sm mb-5">
              Try widening the search, choosing a different category, or
              clearing one of the active filters.
            </p>
            {activeChips.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm px-5 py-2.5 transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((listing) => (
              <InvestListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Labeled select helper ───────────────────────────────────────── */

function LabeledSelect({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  // Inline label keeps the dropdown self-describing — once a user
  // picks "QLD" they still see "State: QLD" on the button, so they
  // remember what it is without re-opening the menu. Also gives
  // screen readers a stable accessible name.
  const current = options.find((o) => o.value === value);
  const display = current ? current.label : options[0]?.label ?? "";
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <span
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-wide text-slate-400"
        aria-hidden="true"
      >
        {label}
      </span>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={`${label}: ${display}`}
        className="appearance-none rounded-lg border border-slate-200 bg-white pl-[52px] pr-8 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value || "default"} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </div>
  );
}
