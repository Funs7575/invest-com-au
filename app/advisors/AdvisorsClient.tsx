"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Professional, ProfessionalType, AdvisorFirm } from "@/lib/types";
import { PROFESSIONAL_TYPE_LABELS, AU_STATES } from "@/lib/types";
import Icon from "@/components/Icon";
import { trackEvent } from "@/lib/tracking";

const TYPE_FILTERS: { key: ProfessionalType | "all"; label: string; icon: string }[] = [
  { key: "all", label: "All Types", icon: "users" },
  { key: "smsf_accountant", label: "SMSF Accountants", icon: "building" },
  { key: "financial_planner", label: "Financial Planners", icon: "trending-up" },
  { key: "property_advisor", label: "Property Advisors", icon: "home" },
  { key: "tax_agent", label: "Tax Agents", icon: "calculator" },
  { key: "mortgage_broker", label: "Mortgage Brokers", icon: "landmark" },
  { key: "estate_planner", label: "Estate Planners", icon: "file-text" },
  { key: "insurance_broker", label: "Insurance Brokers", icon: "shield" },
  { key: "buyers_agent", label: "Buyers Agents", icon: "search" },
  { key: "real_estate_agent", label: "Real Estate Agents", icon: "map-pin" },
  { key: "wealth_manager", label: "Wealth Managers", icon: "briefcase" },
  { key: "aged_care_advisor", label: "Aged Care Advisors", icon: "heart" },
  { key: "crypto_advisor", label: "Crypto Advisors", icon: "bitcoin" },
  { key: "debt_counsellor", label: "Debt Counsellors", icon: "credit-card" },
  { key: "real_estate_agent", label: "Real Estate Agents", icon: "map" },
];

const RADIUS_OPTIONS = [
  { value: 10, label: "10 km" },
  { value: 25, label: "25 km" },
  { value: 50, label: "50 km" },
  { value: 100, label: "100 km" },
  { value: 200, label: "200 km" },
  { value: 0, label: "Any distance" },
];

type SortKey = "rating" | "name" | "newest" | "reviews" | "distance" | "fee_low" | "fee_high";
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "rating", label: "Highest Rated" },
  { key: "reviews", label: "Most Reviewed" },
  { key: "distance", label: "Nearest" },
  { key: "fee_low", label: "Lowest Fee" },
  { key: "fee_high", label: "Highest Fee" },
  { key: "name", label: "Name (A-Z)" },
  { key: "newest", label: "Newest" },
];

const RESULTS_PER_PAGE = 12;

function renderStars(rating: number) {
  return "\u2605".repeat(Math.floor(rating)) + (rating % 1 >= 0.5 ? "\u00BD" : "");
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-AU", { maximumFractionDigits: 0 })}`;
}

interface PostcodeResult {
  postcode: string;
  locality: string;
  state: string;
  latitude: number;
  longitude: number;
}

function LocationSearch({ onSelect, selected }: { onSelect: (p: PostcodeResult | null) => void; selected: PostcodeResult | null }) {
  const [query, setQuery] = useState(selected ? `${selected.locality}, ${selected.state}` : "");
  const [results, setResults] = useState<PostcodeResult[]>([]);
  const [open, setOpen] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const search = useCallback((q: string) => {
    clearTimeout(timeout.current);
    if (q.length < 2) { setResults([]); return; }
    timeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/advisor-search/postcodes?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.postcodes || []);
          setOpen(true);
        }
      } catch { /* ignore */ }
    }, 250);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Icon name="map-pin" size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); search(e.target.value); }}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Suburb or postcode..."
          className="w-full pl-8 pr-8 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30"
        />
        {selected && (
          <button onClick={() => { setQuery(""); onSelect(null); setResults([]); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <Icon name="x" size={14} />
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {results.map(p => (
            <button
              key={p.postcode}
              onClick={() => { onSelect(p); setQuery(`${p.locality}, ${p.state}`); setOpen(false); }}
              className="w-full text-left px-3 py-2 hover:bg-violet-50 text-sm text-slate-700 flex items-center justify-between"
            >
              <span>{p.locality}, {p.state}</span>
              <span className="text-xs text-slate-400">{p.postcode}</span>
            </button>
          ))}
        </div>
      )}
      {open && results.length === 0 && query.length >= 2 && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg p-3">
          <p className="text-xs text-slate-400">No locations found</p>
        </div>
      )}
    </div>
  );
}

function UseMyLocation({ onLocate }: { onLocate: (lat: number, lng: number) => void }) {
  const [loading, setLoading] = useState(false);
  return (
    <button
      onClick={() => {
        if (!navigator.geolocation) return;
        setLoading(true);
        navigator.geolocation.getCurrentPosition(
          pos => { onLocate(pos.coords.latitude, pos.coords.longitude); setLoading(false); },
          () => setLoading(false),
          { enableHighAccuracy: false, timeout: 10000 }
        );
      }}
      className="flex items-center gap-1 text-[0.65rem] font-semibold text-violet-600 hover:text-violet-800 transition-colors"
    >
      <Icon name="navigation" size={12} />
      {loading ? "Locating..." : "Use my location"}
    </button>
  );
}

export default function AdvisorsClient({ professionals, initialType, initialState, pageTitle, pageDescription, faqs = [], editorial, firms = [], firmMemberCounts = {} }: {
  professionals: Professional[];
  initialType?: ProfessionalType;
  initialState?: string;
  pageTitle?: string;
  pageDescription?: string;
  faqs?: { q: string; a: string }[];
  editorial?: { howToChoose: string[]; costGuide: string; industryInsight: string };
  firms?: AdvisorFirm[];
  firmMemberCounts?: Record<number, number>;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const trackedRef = useRef(false);

  useEffect(() => {
    if (trackedRef.current) return;
    trackedRef.current = true;
    trackEvent('advisor_directory_view', {
      total_advisors: professionals.length,
      initial_type: initialType || 'all',
      initial_state: initialState || 'all',
    }, '/advisors');
  }, [professionals.length, initialType, initialState]);

  const [typeFilters, setTypeFilters] = useState<Set<ProfessionalType>>(() => {
    if (initialType) return new Set([initialType]);
    return new Set();
  });
  const toggleType = (key: ProfessionalType | "all") => {
    if (key === "all") {
      setTypeFilters(new Set());
    } else {
      setTypeFilters(prev => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key); else next.add(key);
        return next;
      });
    }
  };
  const [stateFilter, setStateFilter] = useState<string>(initialState || "all");
  const [specialtyFilters, setSpecialtyFilters] = useState<string[]>([]);
  const [feeFilter, setFeeFilter] = useState<string>("all");
  const [firmFilter, setFirmFilter] = useState<string>("all");
  const [minRating, setMinRating] = useState<number>(0);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("rating");
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Location/proximity state
  const [locationSearch, setLocationSearch] = useState<PostcodeResult | null>(null);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [radius, setRadius] = useState(25);

  // API-fetched nearby results
  const [nearbyResults, setNearbyResults] = useState<Professional[] | null>(null);
  const [nearbyLoading, setNearbyLoading] = useState(false);

  const isLocationActive = userLat !== null && userLng !== null;

  // When location is selected from search
  useEffect(() => {
    if (locationSearch) {
      setUserLat(locationSearch.latitude);
      setUserLng(locationSearch.longitude);
      setSortBy("distance");
    }
  }, [locationSearch]);

  // Fetch nearby advisors when location/radius changes
  useEffect(() => {
    if (!isLocationActive) { setNearbyResults(null); return; }
    const controller = new AbortController();
    setNearbyLoading(true);
    const params = new URLSearchParams({
      lat: String(userLat),
      lng: String(userLng),
      ...(radius > 0 ? { radius: String(radius) } : { radius: "500" }),
      limit: "100",
      ...(typeFilters.size > 0 ? { type: Array.from(typeFilters).join(",") } : {}),
      ...(feeFilter !== "all" ? { fee_structure: feeFilter } : {}),
      ...(specialtyFilters.length > 0 ? { specialty: specialtyFilters[0] } : {}),
    });
    fetch(`/api/advisor-search?${params}`, { signal: controller.signal })
      .then(r => r.json())
      .then(data => { setNearbyResults(data.advisors || []); setNearbyLoading(false); })
      .catch(() => setNearbyLoading(false));
    return () => controller.abort();
  }, [userLat, userLng, radius, typeFilters, feeFilter, specialtyFilters, isLocationActive]);

  useEffect(() => {
    if (initialType || initialState) return;
    const t = searchParams.get("type");
    const s = searchParams.get("state");
    const sp = searchParams.get("specialty");
    const sort = searchParams.get("sort");
    const q = searchParams.get("q");
    if (t) {
      const types = t.split(",").filter(v => TYPE_FILTERS.some(f => f.key === v)) as ProfessionalType[];
      if (types.length > 0) setTypeFilters(new Set(types));
    }
    if (s && AU_STATES.includes(s as typeof AU_STATES[number])) setStateFilter(s);
    if (sp) setSpecialtyFilters(sp.split(","));
    if (sort) setSortBy(sort as SortKey);
    if (q) setSearch(q);
  }, [searchParams, initialType, initialState]);

  const updateURL = useCallback(() => {
    const params = new URLSearchParams();
    if (typeFilters.size > 0) params.set("type", Array.from(typeFilters).join(","));
    if (stateFilter !== "all") params.set("state", stateFilter);
    if (specialtyFilters.length) params.set("specialty", specialtyFilters.join(","));
    if (sortBy !== "rating") params.set("sort", sortBy);
    if (search) params.set("q", search);
    const qs = params.toString();
    router.replace(`/advisors${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [typeFilters, stateFilter, specialtyFilters, sortBy, search, router]);

  useEffect(() => {
    const t = setTimeout(updateURL, 300);
    return () => clearTimeout(t);
  }, [updateURL]);

  useEffect(() => { setPage(1); }, [typeFilters, stateFilter, specialtyFilters, feeFilter, firmFilter, minRating, verifiedOnly, search, sortBy, nearbyResults]);

  const allSpecialties = useMemo(() => {
    const set = new Set<string>();
    professionals.forEach(p => p.specialties.forEach(s => set.add(s)));
    return Array.from(set).sort();
  }, [professionals]);

  const allFirmNames = useMemo(() => {
    const set = new Set<string>();
    professionals.forEach(p => { if (p.firm_name) set.add(p.firm_name); });
    return Array.from(set).sort();
  }, [professionals]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: professionals.length };
    professionals.forEach(p => { counts[p.type] = (counts[p.type] || 0) + 1; });
    return counts;
  }, [professionals]);

  // Use nearby results when location active, otherwise client-side filter
  const filtered = useMemo(() => {
    if (isLocationActive && nearbyResults) {
      let result = [...nearbyResults];
      if (verifiedOnly) result = result.filter(p => p.verified);
      if (search) {
        const q = search.toLowerCase();
        result = result.filter(p =>
          p.name.toLowerCase().includes(q) || p.firm_name?.toLowerCase().includes(q) ||
          p.specialties.some(s => s.toLowerCase().includes(q)) ||
          p.location_display?.toLowerCase().includes(q)
        );
      }
      // Sort already done by API (distance) but allow re-sort
      if (sortBy !== "distance") {
        switch (sortBy) {
          case "rating": result.sort((a, b) => (b.rating || 0) - (a.rating || 0)); break;
          case "reviews": result.sort((a, b) => (b.review_count || 0) - (a.review_count || 0)); break;
          case "name": result.sort((a, b) => a.name.localeCompare(b.name)); break;
          case "fee_low": result.sort((a, b) => (a.hourly_rate_cents || a.flat_fee_cents || 999999) - (b.hourly_rate_cents || b.flat_fee_cents || 999999)); break;
          case "fee_high": result.sort((a, b) => (b.hourly_rate_cents || b.flat_fee_cents || 0) - (a.hourly_rate_cents || a.flat_fee_cents || 0)); break;
          case "newest": result.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()); break;
        }
      }
      return result;
    }

    let result = professionals.filter(p => {
      if (typeFilters.size > 0 && !typeFilters.has(p.type as ProfessionalType)) return false;
      if (stateFilter !== "all" && p.location_state !== stateFilter) return false;
      if (verifiedOnly && !p.verified) return false;
      if (feeFilter !== "all" && p.fee_structure !== feeFilter) return false;
      if (firmFilter !== "all" && p.firm_name !== firmFilter) return false;
      if (minRating > 0 && (p.rating || 0) < minRating) return false;
      if (specialtyFilters.length > 0 && !specialtyFilters.every(sf => p.specialties.includes(sf))) return false;
      if (search) {
        const q = search.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.firm_name?.toLowerCase().includes(q) || p.specialties.some(s => s.toLowerCase().includes(q)) || p.location_display?.toLowerCase().includes(q) || p.location_suburb?.toLowerCase().includes(q);
      }
      return true;
    });
    switch (sortBy) {
      case "rating": result.sort((a, b) => (b.rating || 0) - (a.rating || 0)); break;
      case "reviews": result.sort((a, b) => (b.review_count || 0) - (a.review_count || 0)); break;
      case "name": result.sort((a, b) => a.name.localeCompare(b.name)); break;
      case "newest": result.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()); break;
      case "fee_low": result.sort((a, b) => (a.hourly_rate_cents || a.flat_fee_cents || 999999) - (b.hourly_rate_cents || b.flat_fee_cents || 999999)); break;
      case "fee_high": result.sort((a, b) => (b.hourly_rate_cents || b.flat_fee_cents || 0) - (a.hourly_rate_cents || a.flat_fee_cents || 0)); break;
    }
    // Featured advisors always appear first within the chosen sort
    const now = new Date();
    result.sort((a, b) => {
      const aFeatured = a.featured_until && new Date(a.featured_until) > now ? 1 : 0;
      const bFeatured = b.featured_until && new Date(b.featured_until) > now ? 1 : 0;
      return bFeatured - aFeatured;
    });
    return result;
  }, [professionals, nearbyResults, isLocationActive, typeFilters, stateFilter, specialtyFilters, feeFilter, firmFilter, minRating, verifiedOnly, search, sortBy]);

  const totalPages = Math.ceil(filtered.length / RESULTS_PER_PAGE);
  const paginatedResults = filtered.slice((page - 1) * RESULTS_PER_PAGE, page * RESULTS_PER_PAGE);

  const activeFilterCount = [typeFilters.size > 0, stateFilter !== "all", specialtyFilters.length > 0, feeFilter !== "all", firmFilter !== "all", minRating > 0, verifiedOnly, isLocationActive].filter(Boolean).length;

  const contextParts: string[] = [];
  if (typeFilters.size > 0) {
    const labels = Array.from(typeFilters).map(t => TYPE_FILTERS.find(f => f.key === t)?.label).filter(Boolean);
    contextParts.push(labels.join(" & ") || "");
  }
  if (stateFilter !== "all") contextParts.push(`in ${stateFilter}`);
  if (isLocationActive && locationSearch) contextParts.push(`near ${locationSearch.locality}`);
  if (specialtyFilters.length > 0) contextParts.push(`specialising in ${specialtyFilters.join(" + ")}`);

  // Dynamic heading based on active filters
  const activeTypeLabel = typeFilters.size > 0
    ? Array.from(typeFilters).map(t => TYPE_FILTERS.find(f => f.key === t)?.label).filter(Boolean).join(" & ")
    : null;
  const dynamicTitle = activeTypeLabel
    ? stateFilter !== "all"
      ? `Find ${activeTypeLabel} in ${stateFilter}`
      : `Find ${activeTypeLabel}`
    : stateFilter !== "all"
      ? `Find Financial Advisors in ${stateFilter}`
      : pageTitle || "Find a Financial Advisor";
  const dynamicDescription = activeTypeLabel
    ? `Browse verified ${activeTypeLabel.toLowerCase()} across Australia. Filter by location, fees, and specialties.`
    : pageDescription || "Browse verified Australian financial professionals. Filter by location, type, fees, and specialties.";

  const toggleSpecialty = (s: string) => setSpecialtyFilters(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  const clearAll = () => {
    setTypeFilters(new Set()); setStateFilter("all"); setSpecialtyFilters([]); setFeeFilter("all");
    setFirmFilter("all"); setMinRating(0);
    setVerifiedOnly(false); setSearch(""); setSortBy("rating");
    setLocationSearch(null); setUserLat(null); setUserLng(null); setRadius(25);
  };

  return (
    <div className="py-5 md:py-12">
      <div className="container-custom max-w-5xl">
        <nav className="text-xs md:text-sm text-slate-500 mb-3 md:mb-6">
          <Link href="/" className="hover:text-slate-900">Home</Link>
          <span className="mx-1.5 md:mx-2">/</span>
          <span className="text-slate-700">{activeTypeLabel || "Find an Advisor"}</span>
        </nav>

        <div className="bg-gradient-to-br from-violet-50 to-slate-50 border border-violet-100 rounded-2xl p-4 md:p-8 mb-4 md:mb-6">
          <h1 className="text-xl md:text-4xl font-extrabold mb-1.5 md:mb-3 text-slate-900">{dynamicTitle}</h1>
          <p className="text-xs md:text-base text-slate-500 mb-3 md:mb-5">
            <span className="md:hidden">{dynamicDescription.slice(0, 60)}...</span>
            <span className="hidden md:inline">{dynamicDescription}</span>
          </p>
          <div className="flex items-center gap-3 md:gap-6 text-[0.62rem] md:text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-violet-500 rounded-full" /><span className="font-semibold text-slate-700">{professionals.length}</span> advisors</span>
            <span className="flex items-center gap-1.5"><Icon name="shield" size={14} className="text-violet-400" />ASIC verified</span>
            <span className="flex items-center gap-1.5"><Icon name="clock" size={14} className="text-violet-400" />Free consultation</span>
          </div>
        </div>

        {/* Search + Filter bar */}
        <div className="flex gap-2 mb-3 md:mb-4">
          <div className="relative flex-1">
            <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search name, firm, specialty, suburb..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2.5 md:py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
            {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><Icon name="x" size={16} /></button>}
          </div>
          <button onClick={() => setFiltersOpen(!filtersOpen)} className={`flex items-center gap-1.5 px-3 md:px-4 py-2.5 border rounded-xl text-sm font-semibold transition-all shrink-0 ${filtersOpen || activeFilterCount > 0 ? "bg-violet-50 border-violet-300 text-violet-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
            <Icon name="sliders" size={16} />
            <span className="hidden md:inline">Filters</span>
            {activeFilterCount > 0 && <span className="w-5 h-5 bg-violet-600 text-white text-[0.6rem] font-bold rounded-full flex items-center justify-center">{activeFilterCount}</span>}
          </button>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as SortKey)} className="hidden md:block px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/30">
            {SORT_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </div>

        {/* Filter panel */}
        {filtersOpen && (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 mb-4 md:mb-6 space-y-4">
            {/* Location / Near me */}
            <div>
              <label className="text-xs font-bold text-slate-700 mb-2 block flex items-center gap-1.5">
                <Icon name="map-pin" size={13} className="text-violet-500" />
                Location
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="md:col-span-2">
                  <LocationSearch selected={locationSearch} onSelect={(p) => { setLocationSearch(p); if (!p) { setUserLat(null); setUserLng(null); } }} />
                </div>
                <div className="flex items-center gap-2">
                  <select value={radius} onChange={e => setRadius(Number(e.target.value))} className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30" disabled={!isLocationActive}>
                    {RADIUS_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                  <UseMyLocation onLocate={(lat, lng) => { setUserLat(lat); setUserLng(lng); setSortBy("distance"); setLocationSearch({ postcode: "", locality: "My location", state: "", latitude: lat, longitude: lng }); }} />
                </div>
              </div>
            </div>

            {/* Advisor Type */}
            <div>
              <label className="text-xs font-bold text-slate-700 mb-2 block">Advisor Type</label>
              <div className="flex flex-wrap gap-1.5">
                {TYPE_FILTERS.map(f => (
                  <button key={f.key} onClick={() => toggleType(f.key)} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${(f.key === "all" ? typeFilters.size === 0 : typeFilters.has(f.key as ProfessionalType)) ? "bg-violet-600 text-white shadow-sm" : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"}`}>
                    <Icon name={f.icon} size={13} className={(f.key === "all" ? typeFilters.size === 0 : typeFilters.has(f.key as ProfessionalType)) ? "text-violet-200" : "text-slate-400"} />
                    {f.label}
                    {typeCounts[f.key] ? <span className={(f.key === "all" ? typeFilters.size === 0 : typeFilters.has(f.key as ProfessionalType)) ? "text-violet-200" : "text-slate-400"}>({typeCounts[f.key]})</span> : null}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">State</label>
                <select value={stateFilter} onChange={e => setStateFilter(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30" disabled={isLocationActive}>
                  <option value="all">All States</option>
                  {AU_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">Fee Structure</label>
                <select value={feeFilter} onChange={e => setFeeFilter(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30">
                  <option value="all">Any</option>
                  <option value="fee-for-service">Fee for Service</option>
                  <option value="commission">Commission</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="percentage of AUM">% of AUM</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">Advisory Firm</label>
                <select value={firmFilter} onChange={e => setFirmFilter(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30">
                  <option value="all">All Firms</option>
                  {allFirmNames.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">Min Rating</label>
                <select value={minRating} onChange={e => setMinRating(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30">
                  <option value={0}>Any</option>
                  <option value={4.5}>4.5+ ★</option>
                  <option value={4.0}>4.0+ ★</option>
                  <option value={3.5}>3.5+ ★</option>
                  <option value={3.0}>3.0+ ★</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">Sort By</label>
                <select value={sortBy} onChange={e => setSortBy(e.target.value as SortKey)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30">
                  {SORT_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer py-2">
                  <input type="checkbox" checked={verifiedOnly} onChange={() => setVerifiedOnly(!verifiedOnly)} className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                  <span className="text-xs font-semibold text-slate-700">Verified only</span>
                </label>
              </div>
            </div>

            {/* Specialties */}
            <div>
              <label className="text-xs font-bold text-slate-700 mb-2 block">Specialties {specialtyFilters.length > 0 && <span className="text-violet-600">({specialtyFilters.length} selected)</span>}</label>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                {allSpecialties.map(s => (
                  <button key={s} onClick={() => toggleSpecialty(s)} className={`px-2.5 py-1 text-[0.65rem] font-medium rounded-full transition-all ${specialtyFilters.includes(s) ? "bg-violet-100 text-violet-700 border border-violet-300" : "bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100"}`}>{s}</button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button onClick={clearAll} className="text-xs text-slate-500 hover:text-slate-700 font-medium">Clear all filters</button>
              <button onClick={() => setFiltersOpen(false)} className="px-4 py-2 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700 transition-colors">
                {nearbyLoading ? "Searching..." : `Show ${filtered.length} result${filtered.length !== 1 ? "s" : ""}`}
              </button>
            </div>
          </div>
        )}

        {/* Active filter chips */}
        {activeFilterCount > 0 && !filtersOpen && (
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            {isLocationActive && locationSearch && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-violet-100 text-violet-700 text-[0.65rem] font-semibold rounded-full">
                <Icon name="map-pin" size={11} />
                {radius > 0 ? `${radius}km from ` : "Near "}{locationSearch.locality}
                <button onClick={() => { setLocationSearch(null); setUserLat(null); setUserLng(null); }} className="hover:text-violet-900"><Icon name="x" size={12} /></button>
              </span>
            )}
            {Array.from(typeFilters).map(t => (
              <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 bg-violet-100 text-violet-700 text-[0.65rem] font-semibold rounded-full">
                {TYPE_FILTERS.find(f => f.key === t)?.label}
                <button onClick={() => toggleType(t)} className="hover:text-violet-900"><Icon name="x" size={12} /></button>
              </span>
            ))}
            {stateFilter !== "all" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 text-[0.65rem] font-semibold rounded-full">
                {stateFilter}
                <button onClick={() => setStateFilter("all")} className="hover:text-blue-900"><Icon name="x" size={12} /></button>
              </span>
            )}
            {specialtyFilters.map(s => (
              <span key={s} className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-700 text-[0.65rem] font-semibold rounded-full">
                {s}
                <button onClick={() => toggleSpecialty(s)} className="hover:text-emerald-900"><Icon name="x" size={12} /></button>
              </span>
            ))}
            {feeFilter !== "all" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 text-[0.65rem] font-semibold rounded-full">
                {feeFilter}
                <button onClick={() => setFeeFilter("all")} className="hover:text-amber-900"><Icon name="x" size={12} /></button>
              </span>
            )}
            {firmFilter !== "all" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-100 text-indigo-700 text-[0.65rem] font-semibold rounded-full">
                {firmFilter}
                <button onClick={() => setFirmFilter("all")} className="hover:text-indigo-900"><Icon name="x" size={12} /></button>
              </span>
            )}
            {minRating > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 text-[0.65rem] font-semibold rounded-full">
                {minRating}+ ★
                <button onClick={() => setMinRating(0)} className="hover:text-amber-900"><Icon name="x" size={12} /></button>
              </span>
            )}
            {verifiedOnly && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 text-[0.65rem] font-semibold rounded-full">
                Verified
                <button onClick={() => setVerifiedOnly(false)} className="hover:text-slate-900"><Icon name="x" size={12} /></button>
              </span>
            )}
            <button onClick={clearAll} className="text-[0.62rem] text-slate-400 hover:text-slate-600 font-medium ml-1">Clear all</button>
          </div>
        )}

        {/* Result count */}
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <p className="text-xs md:text-sm text-slate-500">
            {nearbyLoading ? (
              <span className="text-slate-400">Searching nearby advisors...</span>
            ) : (
              <>
                <span className="font-bold text-slate-700">{filtered.length}</span>{" "}
                {contextParts.length > 0 ? contextParts.join(" ") : `advisor${filtered.length !== 1 ? "s" : ""}`}
                {search && <span className="text-slate-400"> matching &ldquo;{search}&rdquo;</span>}
              </>
            )}
          </p>
          {totalPages > 1 && <p className="text-[0.62rem] md:text-xs text-slate-400">Page {page} of {totalPages}</p>}
        </div>

        {/* View Toggle — Advisors vs Firms */}
        {firms.length > 0 && (
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => { /* handled by clearing firm filter */ setFirmFilter("all"); }}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                firmFilter === "all" ? "bg-violet-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Advisors ({professionals.length})
            </button>
            {firms.map(firm => (
              <button
                key={firm.id}
                onClick={() => setFirmFilter(firm.name)}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                  firmFilter === firm.name ? "bg-violet-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <span className="w-5 h-5 rounded bg-violet-100 flex items-center justify-center text-[0.5rem] font-bold text-violet-600 shrink-0">
                  {firm.name.split(/\s+/).slice(0, 2).map((w: string) => w[0]).join("").toUpperCase()}
                </span>
                {firm.name}
                <span className={`text-xs ${firmFilter === firm.name ? "text-violet-200" : "text-slate-400"}`}>({firmMemberCounts[firm.id] || 0})</span>
              </button>
            ))}
          </div>
        )}

        {/* Firm detail card — shown when a firm is selected */}
        {firmFilter !== "all" && (() => {
          const selectedFirm = firms.find((f: AdvisorFirm) => f.name === firmFilter);
          if (!selectedFirm) return null;
          return (
            <div className="bg-white border border-violet-200 rounded-xl p-4 md:p-5 mb-4 flex flex-col md:flex-row gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-100 to-violet-50 border border-violet-200 flex items-center justify-center shrink-0">
                  {selectedFirm.logo_url ? (
                    <Image src={selectedFirm.logo_url} alt={selectedFirm.name} width={56} height={56} className="w-full h-full object-contain rounded-xl" />
                  ) : (
                    <span className="text-lg font-bold text-violet-600">
                      {selectedFirm.name.split(/\s+/).slice(0, 2).map((w: string) => w[0]).join("").toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-slate-900">{selectedFirm.name}</h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-xs text-slate-500">
                    {selectedFirm.location_display && <span className="flex items-center gap-1"><Icon name="map-pin" size={11} className="text-slate-400" />{selectedFirm.location_display}</span>}
                    {selectedFirm.afsl_number && <span className="flex items-center gap-1"><Icon name="shield" size={11} className="text-violet-400" />AFSL {selectedFirm.afsl_number}</span>}
                    <span className="flex items-center gap-1"><Icon name="users" size={11} className="text-blue-400" />{firmMemberCounts[selectedFirm.id] || 0} advisors</span>
                  </div>
                  {selectedFirm.bio && <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{selectedFirm.bio}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link href={`/firm/${selectedFirm.slug}`} className="px-4 py-2 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700 transition-colors">
                  View Firm Profile →
                </Link>
              </div>
            </div>
          );
        })()}

        {/* Results */}
        {nearbyLoading ? (
          <div className="space-y-2.5 md:space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 animate-pulse">
                <div className="flex gap-4">
                  <div className="w-16 h-16 rounded-xl bg-slate-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-40 bg-slate-100 rounded" />
                    <div className="h-3 w-28 bg-slate-50 rounded" />
                    <div className="h-3 w-64 bg-slate-50 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : paginatedResults.length > 0 ? (
          <div className="space-y-2.5 md:space-y-3">
            {paginatedResults.map(pro => (
              <Link key={pro.id} href={`/advisor/${pro.slug}`} className={`block bg-white border rounded-xl p-3.5 md:p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 ${pro.featured_until && new Date(pro.featured_until) > new Date() ? "border-amber-300 ring-1 ring-amber-100 hover:border-amber-400" : "border-slate-200 hover:border-violet-200"}`}>
                <div className="flex gap-3 md:gap-4">
                  {pro.photo_url ? (
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl overflow-hidden shrink-0 ring-2 ring-violet-100">
                      <img src={pro.photo_url} alt={pro.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl bg-gradient-to-br from-violet-100 to-slate-100 flex items-center justify-center text-sm md:text-lg font-bold text-violet-600 shrink-0">
                      {pro.name.split(" ").map(n => n[0]).join("")}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-bold text-sm md:text-base text-slate-900 truncate">{pro.name}</span>
                      {pro.verified && (
                        <span className="shrink-0 text-[0.56rem] md:text-[0.62rem] font-bold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 flex items-center gap-0.5">
                          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                          Verified
                        </span>
                      )}
                      {pro.featured_until && new Date(pro.featured_until) > new Date() && (
                        <span className="shrink-0 text-[0.56rem] md:text-[0.62rem] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 flex items-center gap-0.5">
                          <Icon name="star" size={10} className="text-amber-500" />
                          Featured
                        </span>
                      )}
                      {pro.avg_response_minutes != null && pro.avg_response_minutes <= 120 && (
                        <span className="shrink-0 text-[0.56rem] md:text-[0.62rem] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-0.5">
                          <Icon name="zap" size={10} className="text-emerald-500" />
                          Fast
                        </span>
                      )}
                    </div>
                    {pro.firm_name && (
                      <div className="text-[0.65rem] md:text-xs text-slate-500 truncate flex items-center gap-1.5">
                        <Icon name="building" size={11} className="text-slate-400 shrink-0" />
                        {pro.firm_name}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[0.62rem] md:text-xs text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full font-medium">{PROFESSIONAL_TYPE_LABELS[pro.type]}</span>
                      {pro.account_type === "firm_member" ? (
                        <span className="text-[0.56rem] md:text-[0.62rem] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                          <Icon name="users" size={10} className="text-blue-400" />Firm
                        </span>
                      ) : !pro.firm_name ? (
                        <span className="text-[0.56rem] md:text-[0.62rem] font-semibold text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded-full">Independent</span>
                      ) : null}
                      {pro.location_display && (
                        <span className="text-[0.62rem] md:text-xs text-slate-400 flex items-center gap-0.5">
                          <Icon name="map-pin" size={11} className="text-slate-300" />{pro.location_display}
                        </span>
                      )}
                      {/* Distance badge */}
                      {pro.distance_km !== undefined && pro.distance_km !== null && (
                        <span className="text-[0.62rem] md:text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                          {pro.distance_km < 1 ? "<1 km" : `${pro.distance_km} km`}
                        </span>
                      )}
                      {/* Fee info */}
                      {pro.fee_description && <span className="text-[0.62rem] md:text-xs font-semibold text-slate-600">{pro.fee_description}</span>}
                    </div>
                    {/* Structured fees */}
                    {(pro.hourly_rate_cents || pro.flat_fee_cents || pro.aum_percentage) && (
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {pro.hourly_rate_cents && (
                          <span className="text-[0.56rem] md:text-[0.62rem] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
                            {formatCents(pro.hourly_rate_cents)}/hr
                          </span>
                        )}
                        {pro.flat_fee_cents && (
                          <span className="text-[0.56rem] md:text-[0.62rem] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
                            {formatCents(pro.flat_fee_cents)} flat
                          </span>
                        )}
                        {pro.aum_percentage && (
                          <span className="text-[0.56rem] md:text-[0.62rem] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
                            {pro.aum_percentage}% AUM
                          </span>
                        )}
                        {pro.initial_consultation_free && (
                          <span className="text-[0.56rem] md:text-[0.62rem] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
                            Free initial consult
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-1.5">
                      {pro.rating > 0 && pro.review_count > 0 && <span className="text-[0.62rem] md:text-xs"><span className="text-amber-500">{renderStars(pro.rating)}</span><span className="text-slate-400 ml-1">{pro.rating} ({pro.review_count})</span></span>}
                    </div>
                    {pro.specialties.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {pro.specialties.slice(0, 4).map(s => (
                          <span key={s} className={`text-[0.56rem] md:text-[0.62rem] font-medium px-2 py-0.5 rounded-full ${specialtyFilters.includes(s) ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-slate-50 text-slate-500"}`}>{s}</span>
                        ))}
                        {pro.specialties.length > 4 && <span className="text-[0.56rem] md:text-[0.62rem] text-slate-400">+{pro.specialties.length - 4}</span>}
                      </div>
                    )}
                    {pro.offer_active && pro.offer_text && (
                      <div className="mt-2 bg-violet-50 border border-violet-100 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
                        <Icon name="tag" size={11} className="text-violet-500 shrink-0" />
                        <span className="text-[0.58rem] md:text-[0.62rem] font-bold text-violet-700 truncate">{pro.offer_text}</span>
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 self-center"><Icon name="chevron-right" size={18} className="text-slate-300" /></div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <Icon name="search" size={32} className="text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-600 mb-1">No advisors found</p>
            <p className="text-xs text-slate-400 mb-3">
              {isLocationActive ? `No advisors within ${radius}km. Try a larger radius.` : search ? `No results for "${search}".` : "Try adjusting your filters."}
            </p>
            <button onClick={clearAll} className="text-xs text-violet-600 font-semibold hover:text-violet-800">Clear all filters</button>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">{"\u2190"} Previous</button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pn: number;
              if (totalPages <= 7) pn = i + 1;
              else if (page <= 4) pn = i + 1;
              else if (page >= totalPages - 3) pn = totalPages - 6 + i;
              else pn = page - 3 + i;
              return <button key={pn} onClick={() => setPage(pn)} className={`w-9 h-9 text-xs font-semibold rounded-lg transition-all ${page === pn ? "bg-violet-600 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{pn}</button>;
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">Next {"\u2192"}</button>
          </div>
        )}

        {/* Editorial content */}
        {editorial && (
          <section className="mt-8 md:mt-12 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-6">
              <h2 className="text-lg md:text-xl font-extrabold text-slate-900 mb-3">How to Choose the Right {pageTitle?.replace(' in Australia', '') || 'Professional'}</h2>
              <ul className="space-y-2.5">
                {editorial.howToChoose.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">{i + 1}</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-white border border-amber-200/60 rounded-xl p-4 md:p-6">
              <h2 className="text-lg md:text-xl font-extrabold text-slate-900 mb-2">Cost Guide</h2>
              <p className="text-sm text-slate-600 leading-relaxed">{editorial.costGuide}</p>
            </div>
            <div className="bg-gradient-to-br from-violet-50 to-white border border-violet-200/60 rounded-xl p-4 md:p-6">
              <h2 className="text-lg md:text-xl font-extrabold text-slate-900 mb-2">Industry Insight</h2>
              <p className="text-sm text-slate-600 leading-relaxed">{editorial.industryInsight}</p>
            </div>
          </section>
        )}

        {/* FAQs */}
        {faqs.length > 0 && (
          <div className="mt-8 md:mt-12">
            <h2 className="text-base md:text-xl font-bold text-slate-900 mb-3 md:mb-4">Frequently Asked Questions</h2>
            <div className="space-y-2 md:space-y-3">
              {faqs.map((faq, i) => (
                <details key={i} className="bg-white border border-slate-200 rounded-lg group">
                  <summary className="px-3.5 py-3 md:px-4 md:py-3.5 font-semibold text-xs md:text-sm text-slate-800 cursor-pointer hover:bg-slate-50 transition-colors list-none flex items-center justify-between">{faq.q}<span className="text-slate-400 group-open:rotate-180 transition-transform ml-2 shrink-0">{"\u25BE"}</span></summary>
                  <p className="px-3.5 pb-3 md:px-4 md:pb-3.5 text-xs md:text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        )}

        {/* Advisor guides */}
        <div className="mt-6 md:mt-8">
          <h2 className="text-sm md:text-base font-bold text-slate-900 mb-2 md:mb-3">Advisor Guides</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
            {[
              { title: "SMSF Accountant", href: "/advisor-guides/how-to-choose-smsf-accountant", icon: "building" },
              { title: "Financial Planner", href: "/advisor-guides/how-to-choose-financial-planner", icon: "trending-up" },
              { title: "Tax Agent", href: "/advisor-guides/how-to-choose-tax-agent-investments", icon: "calculator" },
              { title: "Property Advisor", href: "/advisor-guides/how-to-choose-property-investment-advisor", icon: "home" },
              { title: "Mortgage Broker", href: "/advisor-guides/how-to-choose-mortgage-broker", icon: "landmark" },
              { title: "Estate Planner", href: "/advisor-guides/how-to-choose-estate-planner", icon: "file-text" },
              { title: "Insurance Broker", href: "/advisor-guides/how-to-choose-insurance-broker", icon: "shield" },
              { title: "Buyers Agent", href: "/advisor-guides/how-to-choose-buyers-agent", icon: "search" },
              { title: "Wealth Manager", href: "/advisor-guides/how-to-choose-wealth-manager", icon: "briefcase" },
              { title: "Aged Care Advisor", href: "/advisor-guides/how-to-choose-aged-care-advisor", icon: "heart" },
              { title: "Crypto Advisor", href: "/advisor-guides/how-to-choose-crypto-advisor", icon: "bitcoin" },
              { title: "Debt Counsellor", href: "/advisor-guides/how-to-choose-debt-counsellor", icon: "credit-card" },
            ].map(g => (
              <Link key={g.href} href={g.href} className="flex items-center gap-2.5 p-3 bg-white border border-slate-200 rounded-lg hover:shadow-md hover:border-slate-300 transition-all">
                <Icon name={g.icon} size={16} className="text-slate-400 shrink-0" />
                <span className="text-xs md:text-sm font-semibold text-slate-700">How to Choose: {g.title}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-6 md:mt-10 bg-slate-50 border border-slate-200 rounded-xl p-4 md:p-6 text-center">
          <h3 className="text-base md:text-lg font-bold text-slate-900 mb-1 md:mb-2">Are you a financial professional?</h3>
          <p className="text-xs md:text-sm text-slate-500 mb-3 md:mb-4">List your practice for free. Only pay when you receive an enquiry.</p>
          <Link href="/advisor-apply" className="inline-block px-5 py-2.5 md:px-6 md:py-3 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors">Get Listed Free {"\u2192"}</Link>
          <Link href="/advisor-portal" className="ml-3 inline-block px-5 py-2.5 md:px-6 md:py-3 border-2 border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors">Advisor Login {"\u2192"}</Link>
        </div>

        <div className="mt-4 md:mt-6 text-[0.58rem] md:text-xs text-slate-400 text-center leading-relaxed">
          <p>All advisors listed are verified against the ASIC Financial Advisers Register or Tax Practitioners Board. Invest.com.au does not provide financial advice. Selecting an advisor is your decision &mdash; we facilitate the connection only.</p>
        </div>
      </div>
    </div>
  );
}
