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
  { value: "cafe_restaurant", label: "Cafe & Restaurant" },
  { value: "retail", label: "Retail" },
  { value: "services", label: "Services" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "online", label: "Online / E-Commerce" },
  { value: "hospitality", label: "Hospitality" },
  { value: "franchise", label: "Franchise" },
];
const PRICE_RANGES = [
  { value: "all", label: "Any Price" },
  { value: "under_500k", label: "Under $500K" },
  { value: "500k_1m", label: "$500K – $1M" },
  { value: "1m_5m", label: "$1M – $5M" },
  { value: "over_5m", label: "$5M+" },
];

interface Props {
  listings: InvestmentListing[];
}

export default function BusinessListingsClient({ listings }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const state = searchParams.get("state") ?? "All";
  const industry = searchParams.get("industry") ?? "all";
  const price = searchParams.get("price") ?? "all";
  const firb = searchParams.get("firb") === "true";

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all" || value === "All" || value === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`?${params.toString()}`, { scroll: false });
  }

  function toggleFirb() {
    const params = new URLSearchParams(searchParams.toString());
    if (firb) {
      params.delete("firb");
    } else {
      params.set("firb", "true");
    }
    router.push(`?${params.toString()}`, { scroll: false });
  }

  const filtered = useMemo(() => {
    return listings.filter((l) => {
      if (state !== "All" && l.location_state !== state) return false;
      if (industry !== "all" && l.industry !== industry) return false;
      if (firb && !l.firb_eligible) return false;
      if (price !== "all") {
        const cents = l.asking_price_cents ?? 0;
        if (price === "under_500k" && cents >= 50_000_000) return false;
        if (price === "500k_1m" && (cents < 50_000_000 || cents >= 100_000_000)) return false;
        if (price === "1m_5m" && (cents < 100_000_000 || cents >= 500_000_000)) return false;
        if (price === "over_5m" && cents < 500_000_000) return false;
      }
      return true;
    });
  }, [listings, state, industry, price, firb]);

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
            <Link href="/invest/buy-business" className="hover:text-slate-900 transition-colors">Buy a Business</Link>
            <Icon name="chevron-right" size={12} className="text-slate-300" />
            <span className="text-slate-900 font-medium">Listings</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-extrabold mb-3 text-slate-900">
            Businesses for Sale in Australia
          </h1>
          <p className="text-slate-600 text-base max-w-2xl">
            {listings.length > 0
              ? `${listings.length} active listing${listings.length !== 1 ? "s" : ""} across Australia`
              : "Browse businesses for sale across Australia"}
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="bg-white border-b border-slate-200 py-4 sticky top-0 z-10">
        <div className="container-custom">
          <div className="flex flex-wrap gap-3 items-center">
            {/* State filter */}
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

            {/* Industry filter */}
            <select
              value={industry}
              onChange={(e) => setParam("industry", e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {INDUSTRIES.map((i) => (
                <option key={i.value} value={i.value}>{i.label}</option>
              ))}
            </select>

            {/* Price filter */}
            <select
              value={price}
              onChange={(e) => setParam("price", e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {PRICE_RANGES.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>

            {/* FIRB toggle */}
            <button
              onClick={toggleFirb}
              className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                firb
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-600 border-slate-200 hover:border-blue-400"
              }`}
            >
              <Icon name="globe" size={13} />
              FIRB Eligible
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
                onClick={() => router.push("/invest/buy-business/listings")}
                className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm px-6 py-2.5 rounded-lg transition-colors"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <SectionHeading
                eyebrow="Active listings"
                title={`${filtered.length} Business${filtered.length !== 1 ? "es" : ""} for Sale`}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} vertical="business" />
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
            Looking to Sell Your Business?
          </h2>
          <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
            List your business on Invest.com.au and reach qualified buyers including international investors.
          </p>
          <Link
            href="/invest/list"
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-6 py-3 rounded-xl transition-colors"
          >
            List Your Business
            <Icon name="arrow-right" size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
