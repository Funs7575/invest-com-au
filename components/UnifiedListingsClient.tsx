"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import ListingCard, { type InvestmentListing } from "@/components/ListingCard";
import Icon from "@/components/Icon";

// ─── Vertical definitions ────────────────────────────────────────────────────

const VERTICALS = [
  { value: "all", label: "All Categories", icon: "layers" },
  { value: "business", label: "Businesses", icon: "briefcase" },
  { value: "mining", label: "Mining", icon: "layers" },
  { value: "farmland", label: "Farmland", icon: "leaf" },
  { value: "commercial_property", label: "Commercial Property", icon: "building" },
  { value: "franchise", label: "Franchise", icon: "star" },
  { value: "energy", label: "Renewable Energy", icon: "zap" },
  { value: "fund", label: "Investment Funds", icon: "dollar-sign" },
  { value: "startup", label: "Startups", icon: "trending-up" },
  { value: "alternatives", label: "Alternatives", icon: "gem" },
  { value: "private_credit", label: "Private Credit", icon: "credit-card" },
  { value: "infrastructure", label: "Infrastructure", icon: "git-branch" },
];

// ─── Shared filters ──────────────────────────────────────────────────────────

const STATES = ["All", "NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];

const PRICE_RANGES = [
  { value: "all", label: "Any Price" },
  { value: "under_500k", label: "Under $500K" },
  { value: "500k_1m", label: "$500K – $1M" },
  { value: "1m_5m", label: "$1M – $5M" },
  { value: "5m_20m", label: "$5M – $20M" },
  { value: "over_20m", label: "$20M+" },
];

const SORT_OPTIONS = [
  { value: "featured", label: "Featured First" },
  { value: "newest", label: "Newest First" },
  { value: "price_asc", label: "Price: Low → High" },
  { value: "price_desc", label: "Price: High → Low" },
];

// ─── Vertical-specific secondary filters ─────────────────────────────────────

const SECONDARY_FILTERS: Record<string, { key: string; label: string; options: { value: string; label: string }[] }> = {
  business: {
    key: "industry",
    label: "Industry",
    options: [
      { value: "all", label: "All Industries" },
      { value: "Hospitality", label: "Hospitality" },
      { value: "Retail", label: "Retail" },
      { value: "Professional Services", label: "Professional Services" },
      { value: "Services", label: "Services" },
      { value: "Healthcare", label: "Healthcare" },
      { value: "Education & Childcare", label: "Education" },
      { value: "Trade Services", label: "Trade Services" },
      { value: "Transport & Logistics", label: "Transport" },
    ],
  },
  mining: {
    key: "sub_category",
    label: "Commodity",
    options: [
      { value: "all", label: "All Commodities" },
      { value: "Gold", label: "Gold" },
      { value: "Lithium", label: "Lithium" },
      { value: "Copper", label: "Copper" },
      { value: "Iron Ore", label: "Iron Ore" },
      { value: "Rare Earths", label: "Rare Earths" },
      { value: "Silver", label: "Silver" },
      { value: "Nickel", label: "Nickel" },
    ],
  },
  farmland: {
    key: "sub_category",
    label: "Type",
    options: [
      { value: "all", label: "All Types" },
      { value: "Cropping", label: "Cropping" },
      { value: "Pastoral", label: "Pastoral / Beef" },
      { value: "Dairy", label: "Dairy" },
      { value: "Viticulture", label: "Viticulture / Wine" },
      { value: "Horticulture", label: "Horticulture" },
      { value: "Mixed", label: "Mixed Farming" },
    ],
  },
  commercial_property: {
    key: "sub_category",
    label: "Asset Class",
    options: [
      { value: "all", label: "All Classes" },
      { value: "Office", label: "Office" },
      { value: "Industrial", label: "Industrial" },
      { value: "Retail", label: "Retail" },
      { value: "Hotel", label: "Hotel" },
      { value: "Childcare", label: "Childcare" },
      { value: "Medical", label: "Medical" },
    ],
  },
  franchise: {
    key: "industry",
    label: "Industry",
    options: [
      { value: "all", label: "All Industries" },
      { value: "Food & Beverage", label: "Food & Beverage" },
      { value: "Fitness", label: "Fitness" },
      { value: "Home Services", label: "Home Services" },
      { value: "Automotive", label: "Automotive" },
      { value: "Education", label: "Education" },
    ],
  },
  energy: {
    key: "sub_category",
    label: "Technology",
    options: [
      { value: "all", label: "All Technologies" },
      { value: "Solar", label: "Solar" },
      { value: "Wind", label: "Wind" },
      { value: "Battery", label: "Battery Storage" },
      { value: "Hydrogen", label: "Hydrogen" },
      { value: "Hydro", label: "Hydro" },
    ],
  },
  startup: {
    key: "industry",
    label: "Sector",
    options: [
      { value: "all", label: "All Sectors" },
      { value: "Fintech", label: "Fintech" },
      { value: "Healthtech", label: "Healthtech" },
      { value: "Proptech", label: "Proptech" },
      { value: "Cleantech", label: "Cleantech" },
      { value: "Agtech", label: "Agtech" },
      { value: "Edtech", label: "Edtech" },
    ],
  },
  alternatives: {
    key: "sub_category",
    label: "Category",
    options: [
      { value: "all", label: "All Categories" },
      { value: "Wine", label: "Wine" },
      { value: "Art", label: "Art" },
      { value: "Cars", label: "Classic Cars" },
      { value: "Watches", label: "Watches" },
      { value: "Coins", label: "Coins" },
      { value: "Whisky", label: "Whisky" },
    ],
  },
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function UnifiedListingsClient({ listings, defaultVertical }: { listings: InvestmentListing[]; defaultVertical?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeVertical = searchParams.get("vertical") || defaultVertical || "all";
  const activeState = searchParams.get("state") || "All";
  const activePrice = searchParams.get("price") || "all";
  const activeSort = searchParams.get("sort") || "featured";
  const activeSecondary = searchParams.get("secondary") || "all";
  const firbOnly = searchParams.get("firb") === "true";
  const sivOnly = searchParams.get("siv") === "true";
  const searchQuery = searchParams.get("q") || "";

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all" || value === "All" || value === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`/invest/listings${params.toString() ? `?${params.toString()}` : ""}`, { scroll: false });
  }

  function setVertical(value: string) {
    // Always route to the unified listings page when changing vertical
    const params = new URLSearchParams();
    if (value !== "all") params.set("vertical", value);
    router.push(`/invest/listings${params.toString() ? `?${params.toString()}` : ""}`, { scroll: false });
  }

  function toggleBool(key: string, current: boolean) {
    const params = new URLSearchParams(searchParams.toString());
    if (current) params.delete(key);
    else params.set(key, "true");
    router.push(`/invest/listings?${params.toString()}`, { scroll: false });
  }

  function clearAll() {
    router.push("/invest/listings", { scroll: false });
  }

  // Active filter count (excluding vertical and sort)
  const activeFilterCount = [
    activeState !== "All",
    activePrice !== "all",
    activeSecondary !== "all",
    firbOnly,
    sivOnly,
    searchQuery.length > 0,
  ].filter(Boolean).length;

  // Secondary filter config for current vertical
  const secondaryFilter = SECONDARY_FILTERS[activeVertical] || null;

  // ─── Filter + Sort ─────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let result = listings.filter((l) => {
      if (activeVertical !== "all" && l.vertical !== activeVertical) return false;
      if (activeState !== "All" && l.location_state !== activeState) return false;
      if (firbOnly && !l.firb_eligible) return false;
      if (sivOnly && !l.siv_complying) return false;

      // Secondary filter (industry or sub_category)
      if (activeSecondary !== "all" && secondaryFilter) {
        const field = secondaryFilter.key as keyof InvestmentListing;
        const val = l[field] as string | null;
        if (!val || !val.toLowerCase().includes(activeSecondary.toLowerCase())) return false;
      }

      // Price range
      if (activePrice !== "all") {
        const price = l.asking_price_cents ?? 0;
        switch (activePrice) {
          case "under_500k": if (price >= 50000000) return false; break;
          case "500k_1m": if (price < 50000000 || price >= 100000000) return false; break;
          case "1m_5m": if (price < 100000000 || price >= 500000000) return false; break;
          case "5m_20m": if (price < 500000000 || price >= 2000000000) return false; break;
          case "over_20m": if (price < 2000000000) return false; break;
        }
      }

      // Keyword search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const haystack = `${l.title} ${l.description || ""} ${l.industry || ""} ${l.sub_category || ""} ${l.location_city || ""} ${l.location_state || ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });

    // Sort
    switch (activeSort) {
      case "newest":
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case "price_asc":
        result.sort((a, b) => (a.asking_price_cents ?? 0) - (b.asking_price_cents ?? 0));
        break;
      case "price_desc":
        result.sort((a, b) => (b.asking_price_cents ?? 0) - (a.asking_price_cents ?? 0));
        break;
      default: // featured
        result.sort((a, b) => {
          const typeOrder: Record<string, number> = { premium: 3, featured: 2, standard: 1 };
          return (typeOrder[b.listing_type] || 0) - (typeOrder[a.listing_type] || 0);
        });
    }

    return result;
  }, [listings, activeVertical, activeState, activePrice, activeSort, activeSecondary, firbOnly, sivOnly, searchQuery, secondaryFilter]);

  // Count per vertical
  const verticalCounts = useMemo(() => {
    const counts: Record<string, number> = { all: listings.length };
    for (const l of listings) {
      counts[l.vertical] = (counts[l.vertical] || 0) + 1;
    }
    return counts;
  }, [listings]);

  // Count per state (for current vertical)
  const stateCounts = useMemo(() => {
    const base = activeVertical === "all" ? listings : listings.filter((l) => l.vertical === activeVertical);
    const counts: Record<string, number> = { All: base.length };
    for (const l of base) {
      if (l.location_state) counts[l.location_state] = (counts[l.location_state] || 0) + 1;
    }
    return counts;
  }, [listings, activeVertical]);

  const activeLabel = VERTICALS.find((v) => v.value === activeVertical)?.label || "All";

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Hero */}
      <section className="bg-white border-b border-slate-100 py-6 md:py-10">
        <div className="container-custom">
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-4" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-slate-900 transition-colors">Home</Link>
            <span className="text-slate-300">/</span>
            <Link href="/invest" className="hover:text-slate-900 transition-colors">Invest</Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">Listings</span>
          </nav>

          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">
              {listings.length} Active Listings
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight mb-2">
            Investment Marketplace
          </h1>
          <p className="text-sm md:text-base text-slate-600 max-w-2xl">
            Browse investment opportunities across all categories — businesses, mining, farmland, commercial property and more.
          </p>
        </div>
      </section>

      {/* Vertical pills */}
      <section className="bg-white border-b border-slate-100 py-3 overflow-x-auto">
        <div className="container-custom">
          <div className="flex items-center gap-2 flex-nowrap">
            {VERTICALS.map((v) => {
              const count = verticalCounts[v.value] || 0;
              const isActive = activeVertical === v.value;
              return (
                <button
                  key={v.value}
                  onClick={() => setVertical(v.value)}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-amber-500 text-slate-900 shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {v.label}
                  {count > 0 && (
                    <span className={`text-[0.6rem] px-1.5 py-0.5 rounded-full ${
                      isActive ? "bg-amber-600/20 text-slate-900" : "bg-slate-200 text-slate-500"
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Filters bar */}
      <section className="bg-white border-b border-slate-200 py-3 sticky top-[68px] z-10 shadow-sm">
        <div className="container-custom">
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[160px] max-w-[280px]">
              <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setParam("q", e.target.value)}
                placeholder="Search listings..."
                className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              />
            </div>

            {/* State */}
            <select
              value={activeState}
              onChange={(e) => setParam("state", e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              {STATES.map((s) => (
                <option key={s} value={s}>
                  {s === "All" ? "All States" : s}{stateCounts[s] ? ` (${stateCounts[s]})` : ""}
                </option>
              ))}
            </select>

            {/* Secondary filter (vertical-specific) */}
            {secondaryFilter && (
              <select
                value={activeSecondary}
                onChange={(e) => setParam("secondary", e.target.value)}
                className="text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                {secondaryFilter.options.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            )}

            {/* Price */}
            <select
              value={activePrice}
              onChange={(e) => setParam("price", e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              {PRICE_RANGES.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={activeSort}
              onChange={(e) => setParam("sort", e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              {SORT_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>

            {/* FIRB toggle */}
            <button
              onClick={() => toggleBool("firb", firbOnly)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                firbOnly
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
              }`}
            >
              <Icon name="globe" size={13} />
              FIRB
            </button>

            {/* SIV toggle */}
            <button
              onClick={() => toggleBool("siv", sivOnly)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                sivOnly
                  ? "bg-purple-50 text-purple-700 border-purple-200"
                  : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
              }`}
            >
              SIV
            </button>

            {/* Result count */}
            <span className="ml-auto text-xs text-slate-500 shrink-0">
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Active filter summary */}
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-xs text-slate-400">Active filters:</span>
              {activeState !== "All" && (
                <button onClick={() => setParam("state", "All")} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs hover:bg-slate-200 transition-colors">
                  {activeState} <span className="text-slate-400">&times;</span>
                </button>
              )}
              {activePrice !== "all" && (
                <button onClick={() => setParam("price", "all")} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs hover:bg-slate-200 transition-colors">
                  {PRICE_RANGES.find((p) => p.value === activePrice)?.label} <span className="text-slate-400">&times;</span>
                </button>
              )}
              {activeSecondary !== "all" && secondaryFilter && (
                <button onClick={() => setParam("secondary", "all")} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs hover:bg-slate-200 transition-colors">
                  {secondaryFilter.options.find((o) => o.value === activeSecondary)?.label} <span className="text-slate-400">&times;</span>
                </button>
              )}
              {firbOnly && (
                <button onClick={() => toggleBool("firb", true)} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-xs hover:bg-blue-100 transition-colors">
                  FIRB Eligible <span className="text-blue-400">&times;</span>
                </button>
              )}
              {sivOnly && (
                <button onClick={() => toggleBool("siv", true)} className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full text-xs hover:bg-purple-100 transition-colors">
                  SIV Complying <span className="text-purple-400">&times;</span>
                </button>
              )}
              {searchQuery && (
                <button onClick={() => setParam("q", "")} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs hover:bg-slate-200 transition-colors">
                  &ldquo;{searchQuery}&rdquo; <span className="text-slate-400">&times;</span>
                </button>
              )}
              <button onClick={clearAll} className="text-xs text-amber-600 font-semibold hover:text-amber-700 ml-1">
                Clear all
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Results */}
      <section className="py-8 md:py-12 bg-slate-50">
        <div className="container-custom">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-extrabold text-slate-900">
              {activeVertical === "all" ? "All Listings" : activeLabel}
            </h2>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <Icon name="search" size={24} className="text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">No listings found</h3>
              <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
                Try adjusting your filters or search term. New listings are added regularly.
              </p>
              <button
                onClick={clearAll}
                className="px-5 py-2.5 bg-amber-500 text-slate-900 text-sm font-bold rounded-xl hover:bg-amber-400 transition-colors"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Save search / email alert */}
      <section className="py-8 bg-white border-t border-slate-100">
        <div className="container-custom">
          <div className="max-w-lg mx-auto bg-amber-50 border border-amber-100 rounded-xl p-5 text-center">
            <Icon name="bell" size={20} className="text-amber-500 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-900 mb-1">Get notified about new listings</h3>
            <p className="text-xs text-slate-500 mb-3">
              {activeVertical !== "all"
                ? `We'll email you when new ${activeLabel.toLowerCase()} listings are added.`
                : "We'll email you when new investment listings are added."}
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const email = (form.elements.namedItem("alert_email") as HTMLInputElement)?.value;
                if (email) {
                  fetch("/api/email-capture", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, source: `listing-alert-${activeVertical}` }),
                  });
                  form.reset();
                  alert("You'll be notified when new listings are added.");
                }
              }}
              className="flex gap-2 max-w-sm mx-auto"
            >
              <input
                name="alert_email"
                type="email"
                placeholder="you@email.com"
                required
                className="flex-1 px-3 py-2 text-sm border border-amber-200 rounded-lg bg-white text-slate-700 placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-amber-500 text-slate-900 text-sm font-bold rounded-lg hover:bg-amber-400 transition-colors shrink-0"
              >
                Notify me
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* List CTA */}
      <section className="py-10 bg-white border-t border-slate-100">
        <div className="container-custom">
          <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-xl p-6 text-center">
            <h2 className="text-lg font-extrabold text-slate-900 mb-2">List Your Investment Opportunity</h2>
            <p className="text-sm text-slate-500 mb-4">
              Advisors, brokers, and fund managers can list investment opportunities directly on Invest.com.au and reach investors.
            </p>
            <Link
              href="/invest/list"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-sm px-6 py-3 rounded-xl transition-colors"
            >
              List an opportunity
              <Icon name="arrow-right" size={15} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
