"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/Icon";
import ListingCard, { type InvestmentListing } from "@/components/ListingCard";
import SectionHeading from "@/components/SectionHeading";

const CITIES = ["All", "Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide", "Canberra", "Gold Coast"];
const PROPERTY_TYPES = [
  { value: "all", label: "All Types" },
  { value: "office", label: "Office" },
  { value: "industrial", label: "Industrial / Logistics" },
  { value: "retail", label: "Retail" },
  { value: "hotel", label: "Hotel / Hospitality" },
  { value: "data_centre", label: "Data Centre" },
  { value: "healthcare", label: "Healthcare" },
];
const YIELD_RANGES = [
  { value: "all", label: "Any Yield" },
  { value: "under_5", label: "Under 5%" },
  { value: "5_7", label: "5% – 7%" },
  { value: "over_7", label: "7%+" },
];

interface Props {
  listings: InvestmentListing[];
}

export default function CommercialListingsClient({ listings }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const city = searchParams.get("city") ?? "All";
  const type = searchParams.get("type") ?? "all";
  const yield_ = searchParams.get("yield") ?? "all";

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
      if (city !== "All" && l.location_city?.toLowerCase() !== city.toLowerCase()) return false;
      if (type !== "all" && l.sub_category !== type && l.industry !== type) return false;
      if (yield_ !== "all") {
        const yld = (l.key_metrics?.yield_percent as number | undefined) ?? 0;
        if (yield_ === "under_5" && yld >= 5) return false;
        if (yield_ === "5_7" && (yld < 5 || yld >= 7)) return false;
        if (yield_ === "over_7" && yld < 7) return false;
      }
      return true;
    });
  }, [listings, city, type, yield_]);

  return (
    <div>
      <section className="bg-white border-b border-slate-100 py-12 md:py-16">
        <div className="container-custom">
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-6" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-slate-900 transition-colors">Home</Link>
            <Icon name="chevron-right" size={12} className="text-slate-300" />
            <Link href="/invest" className="hover:text-slate-900 transition-colors">Invest</Link>
            <Icon name="chevron-right" size={12} className="text-slate-300" />
            <Link href="/invest/commercial-property" className="hover:text-slate-900 transition-colors">Commercial Property</Link>
            <Icon name="chevron-right" size={12} className="text-slate-300" />
            <span className="text-slate-900 font-medium">Listings</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-extrabold mb-3 text-slate-900">Commercial Property for Sale</h1>
          <p className="text-slate-600 text-base max-w-2xl">
            {listings.length > 0
              ? `${listings.length} active listing${listings.length !== 1 ? "s" : ""} — office, industrial, retail, and hotel assets across Australia`
              : "Commercial properties for sale across Australia with yield data and direct enquiry"}
          </p>
        </div>
      </section>

      <section className="bg-white border-b border-slate-200 py-4 sticky top-0 z-10">
        <div className="container-custom">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-1.5">
              <Icon name="map-pin" size={14} className="text-slate-400" />
              <select
                value={city}
                onChange={(e) => setParam("city", e.target.value)}
                className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                {CITIES.map((c) => (
                  <option key={c} value={c}>{c === "All" ? "All Cities" : c}</option>
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
              value={yield_}
              onChange={(e) => setParam("yield", e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {YIELD_RANGES.map((y) => (
                <option key={y.value} value={y.value}>{y.label}</option>
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
                onClick={() => router.push("/invest/listings?vertical=commercial_property")}
                className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm px-6 py-2.5 rounded-lg transition-colors"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <SectionHeading eyebrow="Active listings" title={`${filtered.length} Commercial Propert${filtered.length !== 1 ? "ies" : "y"}`} />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} vertical="commercial_property" />
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <section className="py-12 bg-white border-t border-slate-100">
        <div className="container-custom text-center">
          <h2 className="text-xl font-extrabold text-slate-900 mb-2">List Your Commercial Property</h2>
          <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
            Reach qualified investors including family offices, funds, and international buyers.
          </p>
          <Link
            href="/invest/list"
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
