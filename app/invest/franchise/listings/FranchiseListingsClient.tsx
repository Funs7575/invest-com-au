"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/Icon";
import ListingCard, { type InvestmentListing } from "@/components/ListingCard";
import SectionHeading from "@/components/SectionHeading";

const STATES = ["All", "NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];
const INDUSTRIES = [
  { value: "all", label: "All Industries" },
  { value: "food", label: "Food & Beverage" },
  { value: "fitness", label: "Fitness & Wellness" },
  { value: "cleaning", label: "Cleaning & Maintenance" },
  { value: "automotive", label: "Automotive" },
  { value: "retail", label: "Retail" },
  { value: "education", label: "Education & Tutoring" },
];
const INVESTMENT_LEVELS = [
  { value: "all", label: "Any Investment" },
  { value: "under_100k", label: "Under $100K" },
  { value: "100k_500k", label: "$100K – $500K" },
  { value: "over_500k", label: "$500K+" },
];

interface Props {
  listings: InvestmentListing[];
}

export default function FranchiseListingsClient({ listings }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const state = searchParams.get("state") ?? "All";
  const industry = searchParams.get("industry") ?? "all";
  const investment = searchParams.get("investment") ?? "all";

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all" || value === "All") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`?${params.toString()}`, { scroll: false });
  }

  const filtered = useMemo(() => {
    return listings.filter((l) => {
      if (state !== "All" && l.location_state !== state) return false;
      if (industry !== "all" && l.industry !== industry) return false;
      if (investment !== "all") {
        const minInv = (l.key_metrics?.min_investment_cents as number | undefined) ?? l.asking_price_cents ?? 0;
        if (investment === "under_100k" && minInv >= 10_000_000) return false;
        if (investment === "100k_500k" && (minInv < 10_000_000 || minInv >= 50_000_000)) return false;
        if (investment === "over_500k" && minInv < 50_000_000) return false;
      }
      return true;
    });
  }, [listings, state, industry, investment]);

  return (
    <div>
      <section className="bg-white border-b border-slate-100 py-12 md:py-16">
        <div className="container-custom">
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-6" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-slate-900 transition-colors">Home</Link>
            <Icon name="chevron-right" size={12} className="text-slate-300" />
            <Link href="/invest" className="hover:text-slate-900 transition-colors">Invest</Link>
            <Icon name="chevron-right" size={12} className="text-slate-300" />
            <Link href="/invest/franchise" className="hover:text-slate-900 transition-colors">Franchise</Link>
            <Icon name="chevron-right" size={12} className="text-slate-300" />
            <span className="text-slate-900 font-medium">Listings</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-extrabold mb-3 text-slate-900">Franchise Opportunities in Australia</h1>
          <p className="text-slate-600 text-base max-w-2xl">
            {listings.length > 0
              ? `${listings.length} available territor${listings.length !== 1 ? "ies" : "y"} across Australia`
              : "Available franchise territories across food, fitness, cleaning, automotive, retail, and education"}
          </p>
        </div>
      </section>

      <section className="bg-white border-b border-slate-200 py-4 sticky top-0 z-10">
        <div className="container-custom">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-1.5">
              <Icon name="map-pin" size={14} className="text-slate-400" />
              <select
                value={state}
                onChange={(e) => setParam("state", e.target.value)}
                className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                {STATES.map((s) => (
                  <option key={s} value={s}>{s === "All" ? "All States" : s}</option>
                ))}
              </select>
            </div>
            <select
              value={industry}
              onChange={(e) => setParam("industry", e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {INDUSTRIES.map((i) => (
                <option key={i.value} value={i.value}>{i.label}</option>
              ))}
            </select>
            <select
              value={investment}
              onChange={(e) => setParam("investment", e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {INVESTMENT_LEVELS.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
            <span className="ml-auto text-sm text-slate-500">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
          </div>
        </div>
      </section>

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
                onClick={() => router.push("/invest/listings?vertical=franchise")}
                className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm px-6 py-2.5 rounded-lg transition-colors"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <SectionHeading eyebrow="Available territories" title={`${filtered.length} Franchise Opportunit${filtered.length !== 1 ? "ies" : "y"}`} />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} vertical="franchise" />
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <section className="py-12 bg-white border-t border-slate-100">
        <div className="container-custom text-center">
          <h2 className="text-xl font-extrabold text-slate-900 mb-2">List Your Franchise Opportunity</h2>
          <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
            Are you a franchisor with available territories? Reach qualified buyers on Invest.com.au.
          </p>
          <Link
            href="/invest/list"
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-6 py-3 rounded-xl transition-colors"
          >
            List Your Franchise
            <Icon name="arrow-right" size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
