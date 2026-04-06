"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/Icon";
import ListingCard, { type InvestmentListing } from "@/components/ListingCard";
import SectionHeading from "@/components/SectionHeading";

const INFRA_TYPES = [
  { value: "all", label: "All Types" },
  { value: "toll_roads", label: "Toll Roads" },
  { value: "energy", label: "Energy" },
  { value: "airports", label: "Airports" },
  { value: "ports", label: "Ports" },
  { value: "utilities", label: "Utilities" },
  { value: "social_infra", label: "Social Infra" },
];
const INVESTMENT_RANGES = [
  { value: "all", label: "Any Investment" },
  { value: "under_1m", label: "Under $1M" },
  { value: "1m_10m", label: "$1M – $10M" },
  { value: "10m_50m", label: "$10M – $50M" },
  { value: "over_50m", label: "$50M+" },
];

interface Props {
  listings: InvestmentListing[];
}

export default function InfrastructureListingsClient({ listings }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const infraType = searchParams.get("type") ?? "all";
  const investment = searchParams.get("investment") ?? "all";
  const listed = searchParams.get("listed");

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all" || value === "All" || value === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`?${params.toString()}`, { scroll: false });
  }

  function toggleListed() {
    const params = new URLSearchParams(searchParams.toString());
    if (listed === "true") {
      params.set("listed", "false");
    } else if (listed === "false") {
      params.delete("listed");
    } else {
      params.set("listed", "true");
    }
    router.push(`?${params.toString()}`, { scroll: false });
  }

  const filtered = useMemo(() => {
    return listings.filter((l) => {
      if (infraType !== "all" && l.sub_category !== infraType) return false;
      if (listed === "true" && !(l.key_metrics?.listed as boolean)) return false;
      if (listed === "false" && (l.key_metrics?.listed as boolean)) return false;
      if (investment !== "all") {
        const cents = l.asking_price_cents ?? 0;
        if (investment === "under_1m" && cents >= 100_000_000) return false;
        if (investment === "1m_10m" && (cents < 100_000_000 || cents >= 1_000_000_000)) return false;
        if (investment === "10m_50m" && (cents < 1_000_000_000 || cents >= 5_000_000_000)) return false;
        if (investment === "over_50m" && cents < 5_000_000_000) return false;
      }
      return true;
    });
  }, [listings, infraType, investment, listed]);

  const listedLabel = listed === "true" ? "Listed" : listed === "false" ? "Unlisted" : "Listed / Unlisted";

  return (
    <div>
      {/* Hero */}
      <section className="bg-white border-b border-slate-100 py-12 md:py-16">
        <div className="container-custom">
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-6" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-slate-900 transition-colors">Home</Link>
            <Icon name="chevron-right" size={12} className="text-slate-300" />
            <Link href="/invest" className="hover:text-slate-900 transition-colors">Invest</Link>
            <Icon name="chevron-right" size={12} className="text-slate-300" />
            <Link href="/invest/infrastructure" className="hover:text-slate-900 transition-colors">Infrastructure</Link>
            <Icon name="chevron-right" size={12} className="text-slate-300" />
            <span className="text-slate-900 font-medium">Listings</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-extrabold mb-3 text-slate-900">
            Infrastructure Investments in Australia
          </h1>
          <p className="text-slate-600 text-base max-w-2xl">
            {listings.length > 0
              ? `${listings.length} active listing${listings.length !== 1 ? "s" : ""} — toll roads, energy, airports, ports and utilities`
              : "Browse infrastructure investment opportunities across Australia"}
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="bg-white border-b border-slate-200 py-4 sticky top-0 z-10">
        <div className="container-custom">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Type filter */}
            <select
              value={infraType}
              onChange={(e) => setParam("type", e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {INFRA_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>

            {/* Investment range filter */}
            <select
              value={investment}
              onChange={(e) => setParam("investment", e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {INVESTMENT_RANGES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>

            {/* Listed/Unlisted toggle */}
            <button
              onClick={toggleListed}
              className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                listed
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-600 border-slate-200 hover:border-blue-400"
              }`}
            >
              <Icon name="bar-chart-2" size={13} />
              {listedLabel}
            </button>

            <span className="ml-auto text-sm text-slate-500">
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </section>

      {/* Listings grid */}
      <section className="py-10 bg-slate-50">
        <div className="container-custom">
          {filtered.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <Icon name="search" size={28} className="text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">No listings found</h3>
              <p className="text-slate-500 text-sm mb-6">Try adjusting your filters, or check back soon as new listings are added regularly.</p>
              <button
                onClick={() => router.push("/invest/listings?vertical=infrastructure")}
                className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm px-6 py-2.5 rounded-lg transition-colors"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <SectionHeading
                eyebrow="Active listings"
                title={`${filtered.length} Infrastructure Investment${filtered.length !== 1 ? "s" : ""} Available`}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} vertical="infrastructure" />
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-12 bg-white border-t border-slate-100">
        <div className="container-custom text-center">
          <h2 className="text-xl font-extrabold text-slate-900 mb-2">
            Have an Infrastructure Asset to List?
          </h2>
          <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
            List your infrastructure investment on Invest.com.au and reach qualified investors including institutional and sovereign capital.
          </p>
          <Link
            href="/invest/list"
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-6 py-3 rounded-xl transition-colors"
          >
            List Your Asset
            <Icon name="arrow-right" size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
