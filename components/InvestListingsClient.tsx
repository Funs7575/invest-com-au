"use client";

import { useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { InvestmentListing, InvestListingVertical } from "@/lib/types";

// ─── Props ───────────────────────────────────────────────────────────
export interface InvestListingsClientProps {
  listings: InvestmentListing[];
  categories: { slug: string; label: string }[];
  initialCategory?: string;
  initialSubcategory?: string;
}

// ─── Vertical → category slug mapping ────────────────────────────────
const VERTICAL_TO_CATEGORY: Record<InvestListingVertical, string> = {
  business: "buy-business",
  commercial_property: "commercial-property",
  energy: "renewable-energy",
  farmland: "farmland",
  franchise: "franchise",
  fund: "funds",
  mining: "mining",
  startup: "startups",
};

/** Fund sub-categories that belong to non-"funds" categories */
const FUND_SUB_TO_CATEGORY: Record<string, string> = {
  art: "alternatives",
  wine: "alternatives",
  private_credit: "private-credit",
  infrastructure: "infrastructure",
};

function categoryForListing(listing: InvestmentListing): string {
  if (listing.vertical === "fund" && listing.sub_category) {
    const override = FUND_SUB_TO_CATEGORY[listing.sub_category];
    if (override) return override;
  }
  return VERTICAL_TO_CATEGORY[listing.vertical] ?? "funds";
}

// ─── Category colors (pill styling) ─────────────────────────────────
const CATEGORY_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  all:                 { bg: "bg-slate-100",   text: "text-slate-700",   ring: "ring-slate-300" },
  "buy-business":      { bg: "bg-blue-100",    text: "text-blue-700",    ring: "ring-blue-300" },
  mining:              { bg: "bg-amber-100",   text: "text-amber-700",   ring: "ring-amber-300" },
  farmland:            { bg: "bg-green-100",   text: "text-green-700",   ring: "ring-green-300" },
  "commercial-property": { bg: "bg-slate-100", text: "text-slate-700",   ring: "ring-slate-400" },
  franchise:           { bg: "bg-purple-100",  text: "text-purple-700",  ring: "ring-purple-300" },
  "renewable-energy":  { bg: "bg-emerald-100", text: "text-emerald-700", ring: "ring-emerald-300" },
  startups:            { bg: "bg-indigo-100",  text: "text-indigo-700",  ring: "ring-indigo-300" },
  alternatives:        { bg: "bg-rose-100",    text: "text-rose-700",    ring: "ring-rose-300" },
  "private-credit":    { bg: "bg-teal-100",    text: "text-teal-700",    ring: "ring-teal-300" },
  infrastructure:      { bg: "bg-cyan-100",    text: "text-cyan-700",    ring: "ring-cyan-300" },
  funds:               { bg: "bg-violet-100",  text: "text-violet-700",  ring: "ring-violet-300" },
};

// ─── Australian states ───────────────────────────────────────────────
const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"] as const;

// ─── Price ranges ────────────────────────────────────────────────────
const PRICE_RANGES = [
  { label: "Any price", min: 0, max: Infinity },
  { label: "Under $100k", min: 0, max: 10_000_000 },
  { label: "$100k – $500k", min: 10_000_000, max: 50_000_000 },
  { label: "$500k – $1M", min: 50_000_000, max: 100_000_000 },
  { label: "$1M – $5M", min: 100_000_000, max: 500_000_000 },
  { label: "$5M+", min: 500_000_000, max: Infinity },
] as const;

// ─── Sort options ────────────────────────────────────────────────────
type SortKey = "newest" | "price-asc" | "price-desc";
const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price Low-High" },
  { value: "price-desc", label: "Price High-Low" },
];

// ─── Helpers ─────────────────────────────────────────────────────────
function formatLocation(state?: string, city?: string): string | null {
  if (city && state) return `${city}, ${state}`;
  return state || city || null;
}

// ─── Component ───────────────────────────────────────────────────────
export default function InvestListingsClient({
  listings,
  categories,
  initialCategory,
  initialSubcategory,
}: InvestListingsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read filter state from URL search params (fall back to props)
  const activeCategory = searchParams.get("category") ?? initialCategory ?? "all";
  const activeSubcategory = searchParams.get("sub") ?? initialSubcategory ?? "";
  const activeState = searchParams.get("state") ?? "";
  const activePriceIdx = Number(searchParams.get("price") ?? "0");
  const activeSort = (searchParams.get("sort") ?? "newest") as SortKey;

  // Build new URLSearchParams and push
  const setParam = useCallback(
    (updates: Record<string, string>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v) {
          next.set(k, v);
        } else {
          next.delete(k);
        }
      }
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
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

    // Category
    if (activeCategory !== "all") {
      result = result.filter((l) => categoryForListing(l) === activeCategory);
    }

    // Sub-category
    if (activeSubcategory) {
      result = result.filter((l) => l.sub_category === activeSubcategory);
    }

    // State
    if (activeState) {
      result = result.filter((l) => l.location_state === activeState);
    }

    // Price range
    if (activePriceIdx > 0 && activePriceIdx < PRICE_RANGES.length) {
      const range = PRICE_RANGES[activePriceIdx];
      result = result.filter((l) => {
        const p = l.asking_price_cents;
        if (p == null) return false;
        return p >= range.min && p < range.max;
      });
    }

    // Sort
    const sorted = [...result];
    if (activeSort === "newest") {
      sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
    } else if (activeSort === "price-asc") {
      sorted.sort((a, b) => (a.asking_price_cents ?? 0) - (b.asking_price_cents ?? 0));
    } else {
      sorted.sort((a, b) => (b.asking_price_cents ?? 0) - (a.asking_price_cents ?? 0));
    }

    return sorted;
  }, [listings, activeCategory, activeSubcategory, activeState, activePriceIdx, activeSort]);

  // All category tabs (prepend "All")
  const tabs = useMemo(
    () => [{ slug: "all", label: "All" }, ...categories],
    [categories],
  );

  return (
    <div>
      {/* ── Sticky category tab bar ── */}
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

      <div className="container-custom py-5 md:py-8">
        {/* ── Secondary filters row ── */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          {/* Sub-category pills */}
          {subCategories.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setParam({ sub: "" })}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  !activeSubcategory
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                All
              </button>
              {subCategories.map((sub) => (
                <button
                  key={sub}
                  onClick={() => setParam({ sub: sub === activeSubcategory ? "" : sub })}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors capitalize ${
                    sub === activeSubcategory
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {sub.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          )}

          {/* State filter */}
          <select
            value={activeState}
            onChange={(e) => setParam({ state: e.target.value })}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            <option value="">All States</option>
            {STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Price range filter */}
          <select
            value={activePriceIdx}
            onChange={(e) => setParam({ price: e.target.value === "0" ? "" : e.target.value })}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            {PRICE_RANGES.map((r, i) => (
              <option key={i} value={i}>
                {r.label}
              </option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={activeSort}
            onChange={(e) => setParam({ sort: e.target.value === "newest" ? "" : e.target.value })}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* ── Results count ── */}
        <p className="text-xs text-slate-500 mb-4">
          {filtered.length} listing{filtered.length !== 1 ? "s" : ""} found
        </p>

        {/* ── Grid of cards ── */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">No listings found</h3>
            <p className="text-sm text-slate-500 max-w-sm">
              Try adjusting your filters or browse a different category.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((listing) => {
              const location = formatLocation(listing.location_state, listing.location_city);
              return (
                <Link
                  key={listing.id}
                  href={`/invest/listing/${listing.slug}`}
                  className="group relative block rounded-xl border border-slate-200 bg-white transition-all duration-200 hover:shadow-lg hover:scale-[1.01]"
                >
                  <div className="p-4">
                    {/* Title + Price */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-bold text-sm text-slate-900 group-hover:text-slate-700 transition-colors line-clamp-2 min-w-0 flex-1">
                        {listing.title}
                      </h3>
                      {listing.price_display && (
                        <span className="shrink-0 text-sm font-bold text-slate-900">
                          {listing.price_display}
                        </span>
                      )}
                    </div>

                    {/* Location */}
                    {location && (
                      <p className="text-[0.65rem] font-semibold text-slate-500 mb-2 truncate">
                        {location}
                      </p>
                    )}

                    {/* Industry / Sub-category + Badges */}
                    <div className="flex flex-wrap items-center gap-1 mb-3">
                      {listing.industry && (
                        <span className="text-[0.6rem] px-1.5 py-0.5 bg-slate-50 rounded font-semibold text-slate-700">
                          {listing.industry}
                        </span>
                      )}
                      {listing.sub_category && (
                        <span className="text-[0.6rem] px-1.5 py-0.5 bg-slate-50 rounded font-semibold text-slate-700 capitalize">
                          {listing.sub_category.replace(/_/g, " ")}
                        </span>
                      )}
                      {listing.firb_eligible && (
                        <span className="text-[0.6rem] px-1.5 py-0.5 bg-emerald-50 rounded font-bold text-emerald-700">
                          FIRB
                        </span>
                      )}
                      {listing.siv_complying && (
                        <span className="text-[0.6rem] px-1.5 py-0.5 bg-blue-50 rounded font-bold text-blue-700">
                          SIV
                        </span>
                      )}
                    </div>

                    {/* CTA */}
                    <div className="flex items-center justify-end">
                      <span className="px-3 py-1.5 text-[0.69rem] font-bold rounded-lg bg-slate-900 text-white group-hover:bg-slate-800 transition-colors">
                        View Details
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
