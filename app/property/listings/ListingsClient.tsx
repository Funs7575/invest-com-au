"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/Icon";
import PropertyDisclaimer from "@/components/PropertyDisclaimer";
import { OFF_THE_PLAN_WARNING } from "@/lib/compliance";
import { getListingImages } from "@/lib/property-images";

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
  new_development: boolean;
  foreign_buyer_eligible: boolean;
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

const BEDS = [
  { value: "0", label: "Any" },
  { value: "1", label: "1+" },
  { value: "2", label: "2+" },
  { value: "3", label: "3+" },
  { value: "4", label: "4+" },
];

const PRICE_RANGES = [
  { value: "all", label: "Any Price", min: null as number | null, max: null as number | null },
  { value: "u500k", label: "Under $500k", min: null, max: 50000000 },
  { value: "500k-750k", label: "$500k–$750k", min: 50000000, max: 75000000 },
  { value: "750k-1m", label: "$750k–$1M", min: 75000000, max: 100000000 },
  { value: "1m-1.5m", label: "$1M–$1.5M", min: 100000000, max: 150000000 },
  { value: "1.5m+", label: "$1.5M+", min: 150000000, max: null },
];

const SORT_OPTIONS = [
  { value: "default", label: "Newest First" },
  { value: "price_asc", label: "Price: Low → High" },
  { value: "price_desc", label: "Price: High → Low" },
  { value: "yield_desc", label: "Highest Yield" },
];

const TYPE_LABELS: Record<string, string> = {
  apartment: "Apartment",
  townhouse: "Townhouse",
  house_land: "House & Land",
};

const TYPE_COLORS: Record<string, string> = {
  apartment: "bg-blue-600",
  townhouse: "bg-emerald-600",
  house_land: "bg-amber-600",
};

function formatPrice(cents: number): string {
  if (cents >= 100000000) return `$${(cents / 100000000).toFixed(1)}M`;
  if (cents >= 100000) return `$${Math.round(cents / 100000)}k`;
  return `$${(cents / 100).toLocaleString()}`;
}

function BedroomRange({ min, max }: { min: number | null; max: number | null }) {
  if (!min) return null;
  const label = max && max !== min ? `${min}–${max}` : `${min}`;
  return (
    <span className="flex items-center gap-1 text-[0.65rem] text-white/80">
      <Icon name="bed" size={10} />
      {label} bed
    </span>
  );
}

function PillBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-all ${
        active
          ? "bg-slate-900 text-white shadow-sm"
          : "bg-slate-50 border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
  );
}

export default function ListingsClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [city, setCity] = useState(searchParams.get("city") || "All");
  const [type, setType] = useState(searchParams.get("type") || "All");
  const [bedsMin, setBedsMin] = useState(searchParams.get("beds") || "0");
  const [priceRange, setPriceRange] = useState(searchParams.get("price") || "all");
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "default");
  const [firbOnly, setFirbOnly] = useState(searchParams.get("firb") === "true");
  const [otpOnly, setOtpOnly] = useState(searchParams.get("otp") === "true");
  const [newDevOnly, setNewDevOnly] = useState(searchParams.get("new_dev") === "true");
  const [foreignBuyer, setForeignBuyer] = useState(searchParams.get("foreign_buyer") === "true");
  const [page, setPage] = useState(parseInt(searchParams.get("page") || "1", 10));

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Persist filters to URL
  useEffect(() => {
    const p = new URLSearchParams();
    if (city !== "All") p.set("city", city);
    if (type !== "All") p.set("type", type);
    if (bedsMin !== "0") p.set("beds", bedsMin);
    if (priceRange !== "all") p.set("price", priceRange);
    if (sortBy !== "default") p.set("sort", sortBy);
    if (firbOnly) p.set("firb", "true");
    if (otpOnly) p.set("otp", "true");
    if (newDevOnly) p.set("new_dev", "true");
    if (foreignBuyer) p.set("foreign_buyer", "true");
    if (page > 1) p.set("page", String(page));
    const qs = p.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [city, type, bedsMin, priceRange, sortBy, firbOnly, otpOnly, newDevOnly, foreignBuyer, page, router, pathname]);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (city !== "All") params.set("city", city);
    if (type !== "All") params.set("type", type);
    if (bedsMin !== "0") params.set("beds_min", bedsMin);
    if (sortBy !== "default") params.set("sort", sortBy);
    const priceData = PRICE_RANGES.find((p) => p.value === priceRange);
    if (priceData?.min != null) params.set("price_min", String(priceData.min));
    if (priceData?.max != null) params.set("price_max", String(priceData.max));
    if (firbOnly) params.set("firb_approved", "true");
    if (otpOnly) params.set("off_the_plan", "true");
    if (newDevOnly) params.set("new_development", "true");
    if (foreignBuyer) params.set("foreign_buyer_eligible", "true");
    try {
      const res = await fetch(`/api/property/listings?${params}`);
      const data = await res.json();
      setListings(data.listings || []);
      setTotalPages(data.total_pages || 1);
      setTotal(data.total || 0);
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [city, type, bedsMin, priceRange, sortBy, firbOnly, otpOnly, newDevOnly, foreignBuyer, page]);

  useEffect(() => { fetchListings(); }, [fetchListings]);
  useEffect(() => { setPage(1); }, [city, type, bedsMin, priceRange, sortBy, firbOnly, otpOnly, newDevOnly, foreignBuyer]);

  const clearAll = () => {
    setCity("All");
    setType("All");
    setBedsMin("0");
    setPriceRange("all");
    setSortBy("default");
    setFirbOnly(false);
    setOtpOnly(false);
    setNewDevOnly(false);
    setForeignBuyer(false);
    setPage(1);
  };

  type ActiveFilter = { key: string; label: string; clear: () => void };
  const activeFilters: ActiveFilter[] = [
    city !== "All" ? { key: "city", label: city, clear: () => setCity("All") } : null,
    type !== "All" ? { key: "type", label: TYPES.find((t) => t.value === type)?.label || type, clear: () => setType("All") } : null,
    bedsMin !== "0" ? { key: "beds", label: `${bedsMin}+ Beds`, clear: () => setBedsMin("0") } : null,
    priceRange !== "all" ? { key: "price", label: PRICE_RANGES.find((p) => p.value === priceRange)?.label || "", clear: () => setPriceRange("all") } : null,
    firbOnly ? { key: "firb", label: "FIRB Approved", clear: () => setFirbOnly(false) } : null,
    otpOnly ? { key: "otp", label: "Off the Plan", clear: () => setOtpOnly(false) } : null,
    newDevOnly ? { key: "new_dev", label: "New Development", clear: () => setNewDevOnly(false) } : null,
    foreignBuyer ? { key: "foreign_buyer", label: "Foreign Buyer OK", clear: () => setForeignBuyer(false) } : null,
  ].filter((f): f is ActiveFilter => f !== null);

  const heroListing = listings[0] && (listings[0].sponsored || listings[0].featured) ? listings[0] : null;
  const gridListings = heroListing ? listings.slice(1) : listings;

  return (
    <div className="bg-white min-h-screen">

      {/* ── Header ───────────────────────────────── */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(245,158,11,0.08),transparent_60%)]" />
        <div className="container-custom py-8 md:py-12 relative">
          <nav className="text-xs text-slate-500 mb-4 flex items-center gap-1.5">
            <Link href="/" className="hover:text-slate-900 transition-colors">Home</Link>
            <span>/</span>
            <Link href="/property" className="hover:text-slate-900 transition-colors">Property</Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">Listings</span>
          </nav>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 mb-2 tracking-tight">
                New Developments &amp; Property Listings
              </h1>
              <p className="text-sm text-slate-600">
                Off-the-plan apartments, townhouses, and house &amp; land packages across Australia.
              </p>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <div className="text-center">
                <div className="text-2xl font-extrabold text-amber-600">50+</div>
                <div className="text-[0.65rem] text-slate-500">Developments</div>
              </div>
              <div className="h-8 w-px bg-slate-200" />
              <div className="text-center">
                <div className="text-2xl font-extrabold text-amber-600">5</div>
                <div className="text-[0.65rem] text-slate-500">Major cities</div>
              </div>
              <div className="h-8 w-px bg-slate-200" />
              <div className="text-center">
                <div className="text-2xl font-extrabold text-emerald-400">Free</div>
                <div className="text-[0.65rem] text-slate-500">Enquiries</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Filter Bar ───────────────────────────── */}
      <section className="bg-white border-b border-slate-200 sticky top-16 lg:top-20 z-30 shadow-sm">
        <div className="container-custom py-2.5 space-y-2.5">

          {/* Row 1: City */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
            <span className="text-[0.6rem] font-bold uppercase tracking-wider text-slate-400 shrink-0 mr-1">City</span>
            {CITIES.map((c) => (
              <PillBtn key={c} active={city === c} onClick={() => setCity(c)}>{c}</PillBtn>
            ))}
          </div>

          {/* Row 2: Type + Beds */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Type pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
              <span className="text-[0.6rem] font-bold uppercase tracking-wider text-slate-400 shrink-0 mr-1">Type</span>
              {TYPES.map((t) => (
                <PillBtn key={t.value} active={type === t.value} onClick={() => setType(t.value)}>{t.label}</PillBtn>
              ))}
            </div>

            <div className="h-5 w-px bg-slate-200 hidden md:block" />

            {/* Beds pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
              <span className="text-[0.6rem] font-bold uppercase tracking-wider text-slate-400 shrink-0 mr-1">Beds</span>
              {BEDS.map((b) => (
                <PillBtn key={b.value} active={bedsMin === b.value} onClick={() => setBedsMin(b.value)}>{b.label}</PillBtn>
              ))}
            </div>
          </div>

          {/* Row 3: Price + Sort */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Price pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide flex-1 min-w-0">
              <span className="text-[0.6rem] font-bold uppercase tracking-wider text-slate-400 shrink-0 mr-1">Price</span>
              {PRICE_RANGES.map((p) => (
                <PillBtn key={p.value} active={priceRange === p.value} onClick={() => setPriceRange(p.value)}>{p.label}</PillBtn>
              ))}
            </div>

            {/* Sort */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[0.6rem] font-bold uppercase tracking-wider text-slate-400">Sort</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400/30 hover:border-slate-300 cursor-pointer"
              >
                {SORT_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 4: Toggles + Result count */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 cursor-pointer hover:text-slate-900 transition-colors select-none">
              <input type="checkbox" checked={firbOnly} onChange={(e) => setFirbOnly(e.target.checked)} className="rounded border-slate-300 text-amber-500 focus:ring-amber-500/30 w-3.5 h-3.5" />
              FIRB Approved
            </label>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 cursor-pointer hover:text-slate-900 transition-colors select-none">
              <input type="checkbox" checked={otpOnly} onChange={(e) => setOtpOnly(e.target.checked)} className="rounded border-slate-300 text-amber-500 focus:ring-amber-500/30 w-3.5 h-3.5" />
              Off the Plan
            </label>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 cursor-pointer hover:text-slate-900 transition-colors select-none">
              <input type="checkbox" checked={newDevOnly} onChange={(e) => setNewDevOnly(e.target.checked)} className="rounded border-slate-300 text-amber-500 focus:ring-amber-500/30 w-3.5 h-3.5" />
              New Development
            </label>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 cursor-pointer hover:text-slate-900 transition-colors select-none">
              <input type="checkbox" checked={foreignBuyer} onChange={(e) => setForeignBuyer(e.target.checked)} className="rounded border-slate-300 text-amber-500 focus:ring-amber-500/30 w-3.5 h-3.5" />
              Foreign Buyer Eligible
            </label>

            {!loading && (
              <span className="ml-auto text-xs text-slate-400 shrink-0">
                {total} listing{total !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Row 5: Active filter chips (only when filters are applied) */}
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5 border-t border-slate-100">
              <span className="text-[0.6rem] font-bold uppercase tracking-wider text-slate-400 mr-0.5">Active</span>
              {activeFilters.map((f) => (
                <button
                  key={f.key}
                  onClick={f.clear}
                  className="flex items-center gap-1 px-2 py-1 text-[0.65rem] font-bold rounded-md bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 hover:border-amber-300 transition-colors"
                >
                  {f.label}
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              ))}
              <button
                onClick={clearAll}
                className="ml-1 text-[0.65rem] font-bold text-slate-400 hover:text-slate-700 underline underline-offset-2 transition-colors"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── Listings ─────────────────────────────── */}
      <section className="py-6 md:py-8">
        <div className="container-custom">
          {loading ? (
            <div className="space-y-4">
              <div className="rounded-2xl overflow-hidden border border-slate-200 animate-pulse">
                <div className="aspect-[3/1] bg-slate-100" />
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="border border-slate-200 rounded-2xl overflow-hidden animate-pulse">
                    <div className="aspect-[4/3] bg-slate-100" />
                    <div className="p-4 space-y-2">
                      <div className="h-3 bg-slate-100 rounded w-1/3" />
                      <div className="h-4 bg-slate-100 rounded w-2/3" />
                      <div className="h-3 bg-slate-100 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : listings.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Icon name="building" size={32} className="text-slate-300" />
              </div>
              <p className="text-slate-600 font-semibold mb-1">No listings match your filters</p>
              <p className="text-sm text-slate-400 mb-4">Try adjusting your city, price range, or other filters</p>
              <button
                onClick={clearAll}
                className="px-4 py-2 text-sm font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <>
              {/* ── Hero listing ──────────────── */}
              {heroListing && (
                <Link
                  href={`/property/listings/${heroListing.slug}`}
                  className="block rounded-2xl overflow-hidden border border-slate-200 hover:shadow-xl hover:border-slate-300 transition-all group mb-5 relative"
                >
                  <div className="aspect-[21/9] md:aspect-[3/1] relative bg-slate-100 overflow-hidden">
                    <Image
                      src={getListingImages(heroListing.slug, heroListing.images, heroListing.property_type)[0]}
                      alt={heroListing.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 1200px"
                      priority
                      className="object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-slate-900/30 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-transparent to-transparent" />
                    <div className="absolute top-3 left-3 flex gap-2">
                      {heroListing.sponsored && (
                        <span className="text-[0.6rem] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">Sponsored</span>
                      )}
                      {heroListing.featured && (
                        <span className="text-[0.6rem] font-bold uppercase tracking-wider text-white bg-amber-500 px-2 py-1 rounded-full">Featured</span>
                      )}
                      {heroListing.property_type && (
                        <span className={`text-[0.6rem] font-bold uppercase tracking-wider text-white px-2 py-1 rounded-full ${TYPE_COLORS[heroListing.property_type] || "bg-slate-600"}`}>
                          {TYPE_LABELS[heroListing.property_type] || heroListing.property_type}
                        </span>
                      )}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-5 md:p-8 flex items-end justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-xs text-white/60 mb-1">{heroListing.city} · {heroListing.suburb} · {heroListing.state}</p>
                        <h2 className="text-xl md:text-3xl font-extrabold text-white mb-1 drop-shadow truncate">{heroListing.title}</h2>
                        {heroListing.developer_name && (
                          <p className="text-xs text-white/60">{heroListing.developer_name}</p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {heroListing.firb_approved && (
                            <span className="text-[0.6rem] font-bold text-emerald-300 bg-emerald-900/50 px-2 py-1 rounded-md">FIRB Approved</span>
                          )}
                          {heroListing.off_the_plan && (
                            <span className="text-[0.6rem] font-bold text-blue-300 bg-blue-900/50 px-2 py-1 rounded-md">Off the Plan</span>
                          )}
                          {heroListing.new_development && (
                            <span className="text-[0.6rem] font-bold text-purple-300 bg-purple-900/50 px-2 py-1 rounded-md">New Development</span>
                          )}
                          {heroListing.foreign_buyer_eligible && (
                            <span className="text-[0.6rem] font-bold text-sky-300 bg-sky-900/50 px-2 py-1 rounded-md">Foreign Buyer OK</span>
                          )}
                          <BedroomRange min={heroListing.bedrooms_min} max={heroListing.bedrooms_max} />
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-2xl md:text-3xl font-extrabold text-white drop-shadow">
                          From {formatPrice(heroListing.price_from_cents)}
                        </div>
                        {heroListing.rental_yield_estimate && (
                          <div className="text-sm font-bold text-emerald-400 mt-0.5">{heroListing.rental_yield_estimate}% est. yield</div>
                        )}
                        {heroListing.completion_date && (
                          <div className="text-xs text-white/50 mt-0.5">Completion: {heroListing.completion_date}</div>
                        )}
                        <div className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-white text-sm font-bold rounded-xl transition-colors">
                          View Details &rarr;
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              )}

              {/* ── Grid ─────────────────────── */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {gridListings.map((listing) => {
                  const imgs = getListingImages(listing.slug, listing.images, listing.property_type);
                  return (
                    <Link
                      key={listing.id}
                      href={`/property/listings/${listing.slug}`}
                      className="border border-slate-200 bg-white rounded-2xl overflow-hidden hover:shadow-lg hover:border-slate-300 transition-all group flex flex-col"
                    >
                      <div className="aspect-[4/3] relative overflow-hidden bg-slate-100 shrink-0">
                        <Image
                          src={imgs[0]}
                          alt={listing.title}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 via-transparent to-transparent" />
                        <div className="absolute top-2 left-2 flex gap-1.5">
                          {listing.sponsored && (
                            <span className="text-[0.55rem] font-bold uppercase tracking-wider text-amber-700 bg-amber-50/95 border border-amber-200 px-1.5 py-0.5 rounded-full">Sponsored</span>
                          )}
                          {listing.property_type && (
                            <span className={`text-[0.55rem] font-bold uppercase tracking-wider text-white px-1.5 py-0.5 rounded-full ${TYPE_COLORS[listing.property_type] || "bg-slate-700"}`}>
                              {TYPE_LABELS[listing.property_type] || listing.property_type}
                            </span>
                          )}
                        </div>
                        <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between">
                          <div className="flex gap-1 flex-wrap">
                            {listing.firb_approved && (
                              <span className="text-[0.55rem] font-bold text-white bg-emerald-600/80 backdrop-blur-sm px-1.5 py-0.5 rounded-md">FIRB</span>
                            )}
                            {listing.off_the_plan && (
                              <span className="text-[0.55rem] font-bold text-white bg-blue-600/80 backdrop-blur-sm px-1.5 py-0.5 rounded-md">Off Plan</span>
                            )}
                            {listing.new_development && (
                              <span className="text-[0.55rem] font-bold text-white bg-purple-600/80 backdrop-blur-sm px-1.5 py-0.5 rounded-md">New Dev</span>
                            )}
                            {listing.foreign_buyer_eligible && (
                              <span className="text-[0.55rem] font-bold text-white bg-sky-600/80 backdrop-blur-sm px-1.5 py-0.5 rounded-md">Foreign OK</span>
                            )}
                          </div>
                          {listing.rental_yield_estimate && (
                            <span className="text-[0.6rem] font-bold text-white bg-emerald-600 px-1.5 py-0.5 rounded-md shadow">
                              {listing.rental_yield_estimate}% yield
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="p-4 flex flex-col flex-1">
                        <p className="text-[0.6rem] font-bold uppercase tracking-wider text-slate-400 mb-1">{listing.city} · {listing.suburb}</p>
                        <h3 className="font-bold text-slate-900 group-hover:text-slate-700 transition-colors mb-1.5 line-clamp-2 text-sm leading-snug">{listing.title}</h3>
                        {(listing.developer_name || listing.property_developers?.name) && (
                          <p className="text-xs text-slate-400 mb-2">{listing.developer_name || listing.property_developers?.name}</p>
                        )}
                        <div className="mt-auto pt-3 border-t border-slate-100">
                          <div className="flex items-end justify-between gap-2">
                            <div>
                              <div className="text-base font-extrabold text-slate-900">
                                From {formatPrice(listing.price_from_cents)}
                              </div>
                              {listing.bedrooms_min && (
                                <div className="text-[0.65rem] text-slate-400 mt-0.5">
                                  {listing.bedrooms_min}{listing.bedrooms_max && listing.bedrooms_max !== listing.bedrooms_min ? `–${listing.bedrooms_max}` : ""} bed
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              {listing.completion_date && (
                                <span className="text-[0.6rem] text-slate-400">{listing.completion_date}</span>
                              )}
                              <span className="text-xs font-bold text-amber-600 group-hover:text-amber-700 group-hover:translate-x-0.5 transition-all flex items-center gap-0.5">
                                Enquire <span>&rarr;</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* ── Pagination ────────────────── */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-10">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page <= 1}
                    className="px-4 py-2 text-xs font-bold border border-slate-200 rounded-lg disabled:opacity-30 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                  >
                    &larr; Previous
                  </button>
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      const p = i + 1;
                      return (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`w-8 h-8 text-xs font-bold rounded-lg transition-all ${
                            page === p ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page >= totalPages}
                    className="px-4 py-2 text-xs font-bold border border-slate-200 rounded-lg disabled:opacity-30 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                  >
                    Next &rarr;
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ── Buyer's agent CTA ─────────────────────── */}
      <section className="py-6 md:py-8 bg-slate-50 border-y border-slate-200">
        <div className="container-custom">
          <div className="flex flex-col md:flex-row items-center justify-between gap-5 bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 md:px-10 md:py-7">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 bg-amber-500/20 rounded-xl flex items-center justify-center shrink-0">
                <Icon name="users" size={22} className="text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Get a verified buyer&apos;s agent on your side</p>
                <p className="text-xs text-slate-400">Off-market access · Negotiation · Due diligence · Free consultation</p>
              </div>
            </div>
            <Link href="/property/buyer-agents" className="shrink-0 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-amber-500/20 whitespace-nowrap">
              Find an Agent &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ── Disclaimers ───────────────────────────── */}
      <section className="pb-8 pt-6">
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
