"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/Icon";
import ListingCard, { type InvestmentListing } from "@/components/ListingCard";
import SectionHeading from "@/components/SectionHeading";

const FUND_TYPES = [
  { value: "all", label: "All Fund Types" },
  { value: "senior_secured", label: "Senior Secured" },
  { value: "mezzanine", label: "Mezzanine" },
  { value: "p2p", label: "P2P" },
  { value: "real_estate_debt", label: "Real Estate Debt" },
];
const MIN_INVESTMENT_RANGES = [
  { value: "all", label: "Any Min Investment" },
  { value: "under_10k", label: "Under $10K" },
  { value: "10k_50k", label: "$10K – $50K" },
  { value: "50k_250k", label: "$50K – $250K" },
  { value: "over_250k", label: "$250K+" },
];
const YIELD_RANGES = [
  { value: "all", label: "Any Yield" },
  { value: "under_5", label: "Under 5%" },
  { value: "5_8", label: "5% – 8%" },
  { value: "8_12", label: "8% – 12%" },
  { value: "over_12", label: "12%+" },
];

interface Props {
  listings: InvestmentListing[];
}

export default function PrivateCreditListingsClient({ listings }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const fundType = searchParams.get("fund_type") ?? "all";
  const minInvestment = searchParams.get("min_investment") ?? "all";
  const yieldRange = searchParams.get("yield") ?? "all";

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all" || value === "All" || value === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`?${params.toString()}`, { scroll: false });
  }

  const filtered = useMemo(() => {
    return listings.filter((l) => {
      if (fundType !== "all" && l.sub_category !== fundType) return false;
      if (minInvestment !== "all") {
        const cents = l.asking_price_cents ?? 0;
        if (minInvestment === "under_10k" && cents >= 1_000_000) return false;
        if (minInvestment === "10k_50k" && (cents < 1_000_000 || cents >= 5_000_000)) return false;
        if (minInvestment === "50k_250k" && (cents < 5_000_000 || cents >= 25_000_000)) return false;
        if (minInvestment === "over_250k" && cents < 25_000_000) return false;
      }
      if (yieldRange !== "all") {
        const targetYield = (l.key_metrics?.target_yield as number) ?? 0;
        if (yieldRange === "under_5" && targetYield >= 5) return false;
        if (yieldRange === "5_8" && (targetYield < 5 || targetYield >= 8)) return false;
        if (yieldRange === "8_12" && (targetYield < 8 || targetYield >= 12)) return false;
        if (yieldRange === "over_12" && targetYield < 12) return false;
      }
      return true;
    });
  }, [listings, fundType, minInvestment, yieldRange]);

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-12 md:py-16">
        <div className="container-custom">
          <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-6" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <Icon name="chevron-right" size={12} className="text-slate-600" />
            <Link href="/invest" className="hover:text-white transition-colors">Invest</Link>
            <Icon name="chevron-right" size={12} className="text-slate-600" />
            <Link href="/invest/private-credit" className="hover:text-white transition-colors">Private Credit</Link>
            <Icon name="chevron-right" size={12} className="text-slate-600" />
            <span className="text-slate-300">Listings</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-extrabold mb-3">
            Private Credit Funds in Australia
          </h1>
          <p className="text-slate-300 text-base max-w-2xl">
            {listings.length > 0
              ? `${listings.length} active listing${listings.length !== 1 ? "s" : ""} — senior secured, mezzanine, P2P and real estate debt`
              : "Browse private credit investment opportunities across Australia"}
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="bg-white border-b border-slate-200 py-4 sticky top-0 z-10">
        <div className="container-custom">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Fund type filter */}
            <select
              value={fundType}
              onChange={(e) => setParam("fund_type", e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {FUND_TYPES.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>

            {/* Min investment filter */}
            <select
              value={minInvestment}
              onChange={(e) => setParam("min_investment", e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {MIN_INVESTMENT_RANGES.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>

            {/* Yield filter */}
            <select
              value={yieldRange}
              onChange={(e) => setParam("yield", e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {YIELD_RANGES.map((y) => (
                <option key={y.value} value={y.value}>{y.label}</option>
              ))}
            </select>

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
                onClick={() => router.push("/invest/private-credit/listings")}
                className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm px-6 py-2.5 rounded-lg transition-colors"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <SectionHeading
                eyebrow="Active listings"
                title={`${filtered.length} Private Credit Fund${filtered.length !== 1 ? "s" : ""} Available`}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} vertical="private_credit" />
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
            Have a Private Credit Fund to List?
          </h2>
          <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
            List your private credit fund on Invest.com.au and reach qualified investors including institutional and international capital.
          </p>
          <Link
            href="/invest/list"
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-6 py-3 rounded-xl transition-colors"
          >
            List Your Fund
            <Icon name="arrow-right" size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
