"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/Icon";
import ListingCard, { type InvestmentListing } from "@/components/ListingCard";
import SectionHeading from "@/components/SectionHeading";

const STATES = ["All", "NSW", "VIC", "QLD", "WA", "SA", "TAS", "NT"];
const PROPERTY_TYPES = [
  { value: "all", label: "All Types" },
  { value: "grazing", label: "Grazing / Livestock" },
  { value: "cropping", label: "Cropping" },
  { value: "dairy", label: "Dairy" },
  { value: "horticulture", label: "Horticulture" },
  { value: "viticulture", label: "Viticulture" },
  { value: "mixed", label: "Mixed Farming" },
];
const SIZE_RANGES = [
  { value: "all", label: "Any Size" },
  { value: "under_500", label: "Under 500 ha" },
  { value: "500_2000", label: "500–2,000 ha" },
  { value: "over_2000", label: "2,000+ ha" },
];

interface Props {
  listings: InvestmentListing[];
}

export default function FarmlandListingsClient({ listings }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const state = searchParams.get("state") ?? "All";
  const type = searchParams.get("type") ?? "all";
  const size = searchParams.get("size") ?? "all";
  const firb = searchParams.get("firb") === "true";

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all" || value === "All") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`?${params.toString()}`, { scroll: false });
  }

  function toggleFirb() {
    const params = new URLSearchParams(searchParams.toString());
    if (firb) { params.delete("firb"); } else { params.set("firb", "true"); }
    router.push(`?${params.toString()}`, { scroll: false });
  }

  const filtered = useMemo(() => {
    return listings.filter((l) => {
      if (state !== "All" && l.location_state !== state) return false;
      if (firb && !l.firb_eligible) return false;
      if (type !== "all" && l.sub_category !== type && l.industry !== type) return false;
      if (size !== "all") {
        const ha = (l.key_metrics?.hectares as number | undefined) ?? 0;
        if (size === "under_500" && ha >= 500) return false;
        if (size === "500_2000" && (ha < 500 || ha >= 2000)) return false;
        if (size === "over_2000" && ha < 2000) return false;
      }
      return true;
    });
  }, [listings, state, type, size, firb]);

  return (
    <div>
      <section className="bg-gradient-to-br from-green-900 via-slate-900 to-slate-900 text-white py-12 md:py-16">
        <div className="container-custom">
          <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-6" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <Icon name="chevron-right" size={12} className="text-slate-600" />
            <Link href="/invest" className="hover:text-white transition-colors">Invest</Link>
            <Icon name="chevron-right" size={12} className="text-slate-600" />
            <Link href="/invest/farmland" className="hover:text-white transition-colors">Farmland</Link>
            <Icon name="chevron-right" size={12} className="text-slate-600" />
            <span className="text-slate-300">Listings</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-extrabold mb-3">Farmland & Agricultural Properties for Sale</h1>
          <p className="text-slate-300 text-base max-w-2xl">
            {listings.length > 0
              ? `${listings.length} active listing${listings.length !== 1 ? "s" : ""} — FIRB-eligible properties highlighted`
              : "Agricultural land for sale across Australia with FIRB guidance for foreign buyers"}
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
              value={type}
              onChange={(e) => setParam("type", e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {PROPERTY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <select
              value={size}
              onChange={(e) => setParam("size", e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {SIZE_RANGES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <button
              onClick={toggleFirb}
              className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                firb ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-blue-400"
              }`}
            >
              <Icon name="globe" size={13} />
              FIRB Eligible
            </button>
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
                onClick={() => router.push("/invest/farmland/listings")}
                className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm px-6 py-2.5 rounded-lg transition-colors"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <SectionHeading eyebrow="Active listings" title={`${filtered.length} Agricultural Propert${filtered.length !== 1 ? "ies" : "y"}`} />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} vertical="farmland" />
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <section className="py-12 bg-white border-t border-slate-100">
        <div className="container-custom text-center">
          <h2 className="text-xl font-extrabold text-slate-900 mb-2">List Your Agricultural Property</h2>
          <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
            Reach qualified buyers including international investors. FIRB-eligible properties attract premium interest.
          </p>
          <Link
            href="/for-advisors"
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-6 py-3 rounded-xl transition-colors"
          >
            List Your Property
            <Icon name="arrow-right" size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
