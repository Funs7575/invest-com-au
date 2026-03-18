"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import PropertyDisclaimer from "@/components/PropertyDisclaimer";
import { OFF_THE_PLAN_WARNING, PROPERTY_DISCLAIMER_SHORT } from "@/lib/compliance";

interface Listing {
  id: number;
  slug: string;
  title: string;
  city: string;
  suburb: string;
  state: string;
  price_from_cents: number;
  price_to_cents: number;
  rental_yield_estimate: number | null;
  completion_date: string | null;
  property_type: string;
  developer_name: string | null;
  sponsored: boolean;
  featured: boolean;
  firb_approved: boolean;
  off_the_plan: boolean;
  bedrooms_min: number | null;
  bedrooms_max: number | null;
  images: string[];
  property_developers?: { name: string; logo_url: string | null; slug: string } | null;
}

const CITIES = ["All", "Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide"];
const TYPES = [
  { value: "All", label: "All Types" },
  { value: "apartment", label: "Apartment" },
  { value: "townhouse", label: "Townhouse" },
  { value: "house_land", label: "House & Land" },
];

function formatPrice(cents: number): string {
  if (cents >= 100000000) return `$${(cents / 100000000).toFixed(1)}M`;
  if (cents >= 100000) return `$${Math.round(cents / 100000)}k`;
  return `$${(cents / 100).toLocaleString()}`;
}

export default function PropertyListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState("All");
  const [type, setType] = useState("All");
  const [firbOnly, setFirbOnly] = useState(false);
  const [otpOnly, setOtpOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (city !== "All") params.set("city", city);
    if (type !== "All") params.set("type", type);
    if (firbOnly) params.set("firb_approved", "true");
    if (otpOnly) params.set("off_the_plan", "true");

    try {
      const res = await fetch(`/api/property/listings?${params}`);
      const data = await res.json();
      setListings(data.listings || []);
      setTotalPages(data.total_pages || 1);
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [city, type, firbOnly, otpOnly, page]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  useEffect(() => {
    setPage(1);
  }, [city, type, firbOnly, otpOnly]);

  return (
    <div className="bg-white min-h-screen">
      {/* Header */}
      <section className="bg-white border-b border-slate-100">
        <div className="container-custom py-6 md:py-8">
          <nav className="text-xs text-slate-400 mb-3 flex items-center gap-1.5">
            <Link href="/" className="hover:text-slate-600">Home</Link>
            <span>/</span>
            <Link href="/property" className="hover:text-slate-600">Property</Link>
            <span>/</span>
            <span className="text-slate-600">Listings</span>
          </nav>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">New Developments &amp; Property Listings</h1>
          <p className="text-sm text-slate-500">Browse off-the-plan apartments, townhouses, and house &amp; land packages across Australia.</p>
        </div>
      </section>

      {/* Filter Bar */}
      <section className="bg-slate-50 border-b border-slate-200 sticky top-16 lg:top-20 z-30">
        <div className="container-custom py-3">
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            {/* City */}
            <div className="flex gap-1 overflow-x-auto">
              {CITIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCity(c)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
                    city === c ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="h-6 w-px bg-slate-200 hidden md:block" />

            {/* Type */}
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>

            {/* Toggles */}
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 cursor-pointer">
              <input type="checkbox" checked={firbOnly} onChange={(e) => setFirbOnly(e.target.checked)} className="rounded border-slate-300 text-amber-500 focus:ring-amber-500/30" />
              FIRB Approved
            </label>
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 cursor-pointer">
              <input type="checkbox" checked={otpOnly} onChange={(e) => setOtpOnly(e.target.checked)} className="rounded border-slate-300 text-amber-500 focus:ring-amber-500/30" />
              Off the Plan
            </label>
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="py-6 md:py-8">
        <div className="container-custom">
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="border border-slate-200 rounded-2xl overflow-hidden animate-pulse">
                  <div className="aspect-[16/10] bg-slate-100" />
                  <div className="p-4 space-y-2">
                    <div className="h-3 bg-slate-100 rounded w-1/3" />
                    <div className="h-4 bg-slate-100 rounded w-2/3" />
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div className="text-center py-16">
              <Icon name="building" size={40} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No listings match your filters.</p>
              <button onClick={() => { setCity("All"); setType("All"); setFirbOnly(false); setOtpOnly(false); }} className="mt-2 text-sm text-amber-600 font-semibold hover:text-amber-700">
                Clear all filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {listings.map((listing) => (
                  <Link
                    key={listing.id}
                    href={`/property/listings/${listing.slug}`}
                    className="border border-slate-200 bg-white rounded-2xl overflow-hidden hover:shadow-md hover:border-slate-300 transition-all group"
                  >
                    <div className="aspect-[16/10] bg-gradient-to-br from-slate-100 to-slate-200 relative flex items-center justify-center">
                      <Icon name="building" size={36} className="text-slate-300" />
                      {listing.sponsored && (
                        <span className="absolute top-2 left-2 text-[0.6rem] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          Sponsored
                        </span>
                      )}
                      {listing.property_type && (
                        <span className="absolute top-2 right-2 text-[0.6rem] font-bold uppercase tracking-wider text-slate-600 bg-white/90 px-2 py-0.5 rounded-full">
                          {listing.property_type === "house_land" ? "House & Land" : listing.property_type}
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          {listing.city} &middot; {listing.suburb}
                        </span>
                        {listing.firb_approved && (
                          <span className="text-[0.6rem] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">FIRB</span>
                        )}
                      </div>
                      <h3 className="font-bold text-slate-900 group-hover:text-slate-600 transition-colors mb-1">{listing.title}</h3>
                      <p className="text-xs text-slate-400 mb-2">{listing.developer_name || listing.property_developers?.name}</p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-bold text-slate-900">
                          From {formatPrice(listing.price_from_cents)}
                          {listing.bedrooms_min && (
                            <span className="text-xs text-slate-400 font-normal ml-1">
                              {listing.bedrooms_min}{listing.bedrooms_max && listing.bedrooms_max !== listing.bedrooms_min ? `–${listing.bedrooms_max}` : ""} bed
                            </span>
                          )}
                        </span>
                        {listing.rental_yield_estimate && (
                          <span className="text-xs text-emerald-600 font-semibold">{listing.rental_yield_estimate}% yield</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        {listing.completion_date && (
                          <span className="text-xs text-slate-400">{listing.completion_date}</span>
                        )}
                        <span className="text-xs font-semibold text-amber-600 group-hover:translate-x-0.5 transition-transform ml-auto">
                          Enquire &rarr;
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg disabled:opacity-30 hover:bg-slate-50"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-slate-500">Page {page} of {totalPages}</span>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page >= totalPages}
                    className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg disabled:opacity-30 hover:bg-slate-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Off-the-plan & Property Disclaimer */}
      <section className="pb-6 md:pb-8">
        <div className="container-custom">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 md:p-5">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-xs font-bold text-amber-800 mb-1">Off-the-Plan Risk Warning</p>
                <p className="text-[0.65rem] md:text-xs text-amber-700 leading-relaxed">{OFF_THE_PLAN_WARNING}</p>
                <PropertyDisclaimer />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
