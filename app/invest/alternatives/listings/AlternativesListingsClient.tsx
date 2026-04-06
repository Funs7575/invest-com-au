"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/Icon";
import ListingCard, { type InvestmentListing } from "@/components/ListingCard";
import SectionHeading from "@/components/SectionHeading";

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "wine", label: "Wine" },
  { value: "art", label: "Art" },
  { value: "cars", label: "Cars" },
  { value: "watches", label: "Watches" },
  { value: "coins", label: "Coins" },
  { value: "whisky", label: "Whisky" },
];
const PRICE_RANGES = [
  { value: "all", label: "Any Price" },
  { value: "under_50k", label: "Under $50K" },
  { value: "50k_250k", label: "$50K – $250K" },
  { value: "250k_1m", label: "$250K – $1M" },
  { value: "over_1m", label: "$1M+" },
];

interface Props {
  listings: InvestmentListing[];
}

export default function AlternativesListingsClient({ listings }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const category = searchParams.get("category") ?? "all";
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
      if (category !== "all" && l.sub_category !== category) return false;
      if (firb && !l.firb_eligible) return false;
      if (price !== "all") {
        const cents = l.asking_price_cents ?? 0;
        if (price === "under_50k" && cents >= 5_000_000) return false;
        if (price === "50k_250k" && (cents < 5_000_000 || cents >= 25_000_000)) return false;
        if (price === "250k_1m" && (cents < 25_000_000 || cents >= 100_000_000)) return false;
        if (price === "over_1m" && cents < 100_000_000) return false;
      }
      return true;
    });
  }, [listings, category, price, firb]);

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
            <Link href="/invest/alternatives" className="hover:text-slate-900 transition-colors">Alternative Investments</Link>
            <Icon name="chevron-right" size={12} className="text-slate-300" />
            <span className="text-slate-900 font-medium">Listings</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-extrabold mb-3 text-slate-900">
            Alternative Investments in Australia
          </h1>
          <p className="text-slate-600 text-base max-w-2xl">
            {listings.length > 0
              ? `${listings.length} active listing${listings.length !== 1 ? "s" : ""} — wine, art, classic cars, watches and more`
              : "Browse alternative investment opportunities across Australia"}
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="bg-white border-b border-slate-200 py-4 sticky top-0 z-10">
        <div className="container-custom">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Category filter */}
            <select
              value={category}
              onChange={(e) => setParam("category", e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
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
                onClick={() => router.push("/invest/alternatives/listings")}
                className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm px-6 py-2.5 rounded-lg transition-colors"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <SectionHeading
                eyebrow="Active listings"
                title={`${filtered.length} Alternative Investment${filtered.length !== 1 ? "s" : ""} Available`}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} vertical="alternatives" />
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
            Have an Alternative Asset to List?
          </h2>
          <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
            List your alternative investment on Invest.com.au and reach qualified buyers including international investors.
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
