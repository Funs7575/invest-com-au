"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import ListingCard, { type InvestmentListing } from "@/components/ListingCard";
import Icon from "@/components/Icon";

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

const STATES = ["All", "NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];

const PRICE_RANGES = [
  { value: "all", label: "Any Price" },
  { value: "under_500k", label: "Under $500K" },
  { value: "500k_1m", label: "$500K – $1M" },
  { value: "1m_5m", label: "$1M – $5M" },
  { value: "5m_20m", label: "$5M – $20M" },
  { value: "over_20m", label: "$20M+" },
];

export default function UnifiedListingsClient({ listings }: { listings: InvestmentListing[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeVertical = searchParams.get("vertical") || "all";
  const activeState = searchParams.get("state") || "All";
  const activePrice = searchParams.get("price") || "all";
  const firbOnly = searchParams.get("firb") === "true";

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all" || value === "All" || value === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`/invest/listings${params.toString() ? `?${params.toString()}` : ""}`, { scroll: false });
  }

  function toggleFirb() {
    const params = new URLSearchParams(searchParams.toString());
    if (firbOnly) {
      params.delete("firb");
    } else {
      params.set("firb", "true");
    }
    router.push(`/invest/listings?${params.toString()}`, { scroll: false });
  }

  const filtered = useMemo(() => {
    return listings.filter((l) => {
      if (activeVertical !== "all" && l.vertical !== activeVertical) return false;
      if (activeState !== "All" && l.location_state !== activeState) return false;
      if (firbOnly && !l.firb_eligible) return false;
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
      return true;
    });
  }, [listings, activeVertical, activeState, activePrice, firbOnly]);

  // Count per vertical for pills
  const verticalCounts = useMemo(() => {
    const counts: Record<string, number> = { all: listings.length };
    for (const l of listings) {
      counts[l.vertical] = (counts[l.vertical] || 0) + 1;
    }
    return counts;
  }, [listings]);

  const activeLabel = VERTICALS.find((v) => v.value === activeVertical)?.label || "All";

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
                  onClick={() => setParam("vertical", v.value)}
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

      {/* Filters */}
      <section className="bg-white border-b border-slate-200 py-3 sticky top-[68px] z-10 shadow-sm">
        <div className="container-custom">
          <div className="flex items-center gap-3 flex-wrap">
            {/* State filter */}
            <div className="flex items-center gap-1.5">
              <Icon name="map-pin" size={14} className="text-slate-400" />
              <select
                value={activeState}
                onChange={(e) => setParam("state", e.target.value)}
                className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                {STATES.map((s) => (
                  <option key={s} value={s}>{s === "All" ? "All States" : s}</option>
                ))}
              </select>
            </div>

            {/* Price filter */}
            <select
              value={activePrice}
              onChange={(e) => setParam("price", e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              {PRICE_RANGES.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>

            {/* FIRB toggle */}
            <button
              onClick={toggleFirb}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                firbOnly
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
              }`}
            >
              <Icon name="globe" size={13} />
              FIRB Eligible
            </button>

            {/* Result count */}
            <span className="ml-auto text-xs text-slate-500 shrink-0">
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>
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
              <p className="text-slate-500 text-sm mb-6">Try adjusting your filters, or check back soon as new listings are added regularly.</p>
              <button
                onClick={() => router.push("/invest/listings")}
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

      {/* List CTA */}
      <section className="py-10 bg-white border-t border-slate-100">
        <div className="container-custom">
          <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-xl p-6 text-center">
            <h2 className="text-lg font-extrabold text-slate-900 mb-2">List Your Investment Opportunity</h2>
            <p className="text-sm text-slate-500 mb-4">
              Advisors, brokers, and fund managers can list investment opportunities directly on Invest.com.au and reach qualified investors.
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
