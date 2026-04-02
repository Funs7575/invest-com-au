"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/Icon";
import ListingCard, { type InvestmentListing } from "@/components/ListingCard";
import SectionHeading from "@/components/SectionHeading";

const STATES = ["All", "NSW", "VIC", "QLD", "WA", "SA", "TAS", "NT"];
const COMMODITIES = [
  { value: "all", label: "All Commodities" },
  { value: "lithium", label: "Lithium" },
  { value: "gold", label: "Gold" },
  { value: "copper", label: "Copper" },
  { value: "iron_ore", label: "Iron Ore" },
  { value: "rare_earths", label: "Rare Earths" },
  { value: "coal", label: "Coal" },
  { value: "nickel", label: "Nickel" },
];
const STAGES = [
  { value: "all", label: "All Stages" },
  { value: "explorer", label: "Explorer" },
  { value: "developer", label: "Developer" },
  { value: "producer", label: "Producer" },
];

interface Props {
  listings: InvestmentListing[];
}

export default function MiningListingsClient({ listings }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const state = searchParams.get("state") ?? "All";
  const commodity = searchParams.get("commodity") ?? "all";
  const stage = searchParams.get("stage") ?? "all";

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
      const km = l.key_metrics ?? {};
      if (commodity !== "all") {
        const c = (km.commodity as string | undefined)?.toLowerCase().replace(/\s+/g, "_");
        if (c !== commodity && l.industry !== commodity) return false;
      }
      if (stage !== "all") {
        const s = (km.stage as string | undefined)?.toLowerCase();
        if (s !== stage && l.sub_category !== stage) return false;
      }
      return true;
    });
  }, [listings, state, commodity, stage]);

  return (
    <div>
      <section className="bg-gradient-to-br from-amber-900 via-slate-900 to-slate-900 text-white py-12 md:py-16">
        <div className="container-custom">
          <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-6" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <Icon name="chevron-right" size={12} className="text-slate-600" />
            <Link href="/invest" className="hover:text-white transition-colors">Invest</Link>
            <Icon name="chevron-right" size={12} className="text-slate-600" />
            <Link href="/invest/mining" className="hover:text-white transition-colors">Mining</Link>
            <Icon name="chevron-right" size={12} className="text-slate-600" />
            <span className="text-slate-300">Opportunities</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-extrabold mb-3">Mining Investment Opportunities</h1>
          <p className="text-slate-300 text-base max-w-2xl">
            {listings.length > 0
              ? `${listings.length} active mining opportunit${listings.length !== 1 ? "ies" : "y"} across Australia`
              : "Direct project investments in Australian mining and resources"}
          </p>
        </div>
      </section>

      {/* Filters */}
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
              value={commodity}
              onChange={(e) => setParam("commodity", e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {COMMODITIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <select
              value={stage}
              onChange={(e) => setParam("stage", e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {STAGES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <span className="ml-auto text-sm text-slate-500">
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </span>
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
                onClick={() => router.push("/invest/mining/opportunities")}
                className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm px-6 py-2.5 rounded-lg transition-colors"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <SectionHeading
                eyebrow="Active opportunities"
                title={`${filtered.length} Mining Opportunit${filtered.length !== 1 ? "ies" : "y"}`}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} vertical="mining" />
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <section className="py-12 bg-white border-t border-slate-100">
        <div className="container-custom text-center">
          <h2 className="text-xl font-extrabold text-slate-900 mb-2">Have a Mining Project to List?</h2>
          <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
            List your mining project on Invest.com.au to reach qualified institutional and private investors.
          </p>
          <Link
            href="/for-advisors"
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-6 py-3 rounded-xl transition-colors"
          >
            List Your Project
            <Icon name="arrow-right" size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
