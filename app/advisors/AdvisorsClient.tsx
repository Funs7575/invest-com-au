"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Professional, ProfessionalType, AdvisorFirm } from "@/lib/types";
import { PROFESSIONAL_TYPE_LABELS, AU_STATES } from "@/lib/types";
import Icon from "@/components/Icon";
import { trackEvent } from "@/lib/tracking";
import { useAdvisorShortlist } from "@/lib/hooks/useAdvisorShortlist";

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
          className="w-full pl-8 pr-8 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
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
              className="w-full text-left px-3 py-2 hover:bg-amber-50 text-sm text-slate-700 flex items-center justify-between"
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
      className="flex items-center gap-1 text-[0.65rem] font-semibold text-amber-600 hover:text-amber-800 transition-colors"
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
  const [internationalOnly, setInternationalOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("rating");
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Location/proximity state
  const [locationSearch, setLocationSearch] = useState<PostcodeResult | null>(null);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);

  // Advisor alert / saved search
  const [alertEmail, setAlertEmail] = useState("");
  const [alertStatus, setAlertStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [alertError, setAlertError] = useState("");

  const saveAlert = async () => {
    if (!alertEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(alertEmail)) {
      setAlertError("Please enter a valid email address.");
      return;
    }
    setAlertStatus("submitting");
    setAlertError("");
    const primaryType = typeFilters.size === 1 ? Array.from(typeFilters)[0] : typeFilters.size === 0 ? "any" : "multiple";
    const locationState = stateFilter !== "all" ? stateFilter : undefined;
    const locationSuburb = locationSearch?.locality;
    try {
      const res = await fetch("/api/advisor-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: alertEmail.trim(), advisor_type: primaryType, location_state: locationState, location_suburb: locationSuburb }),
      });
      const data = await res.json();
      if (res.ok) {
        setAlertStatus("done");
      } else {
        setAlertError(data.error || "Failed to save alert.");
        setAlertStatus("error");
      }
    } catch {
      setAlertError("Network error. Please try again.");
      setAlertStatus("error");
    }
  };
  const [radius, setRadius] = useState(25);

  // API-fetched nearby results
  const [nearbyResults, setNearbyResults] = useState<Professional[] | null>(null);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const { toggle: toggleShortlist, has: inShortlist, count: shortlistCount, max: shortlistMax } = useAdvisorShortlist();

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

  const initialRenderRef = useRef(true);

  const updateURL = useCallback(() => {
    const params = new URLSearchParams();
    if (typeFilters.size > 0) params.set("type", Array.from(typeFilters).join(","));
    if (stateFilter !== "all") params.set("state", stateFilter);
    if (specialtyFilters.length) params.set("specialty", specialtyFilters.join(","));
    if (sortBy !== "rating") params.set("sort", sortBy);
    if (search) params.set("q", search);
    const qs = params.toString();
    const newPath = `/advisors${qs ? `?${qs}` : ""}`;
    // Skip if URL hasn't changed (prevents initial load re-render cycle)
    const currentQs = searchParams.toString();
    if (qs === currentQs) return;
    router.replace(newPath, { scroll: false });
  }, [typeFilters, stateFilter, specialtyFilters, sortBy, search, router, searchParams]);

  useEffect(() => {
    // Skip the very first render to prevent immediate router.replace on page load
    if (initialRenderRef.current) {
      initialRenderRef.current = false;
      return;
    }
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

    const result = professionals.filter(p => {
      if (typeFilters.size > 0 && !typeFilters.has(p.type as ProfessionalType)) return false;
      if (stateFilter !== "all" && p.location_state !== stateFilter) return false;
      if (verifiedOnly && !p.verified) return false;
      if (feeFilter !== "all" && p.fee_structure !== feeFilter) return false;
      if (firmFilter !== "all" && p.firm_name !== firmFilter) return false;
      if (minRating > 0 && (p.rating || 0) < minRating) return false;
      if (specialtyFilters.length > 0 && !specialtyFilters.every(sf => p.specialties.includes(sf))) return false;
      if (internationalOnly && !p.accepts_international_clients && !p.firb_specialist && !p.international_tax_specialist) return false;
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

  const activeFilterCount = [typeFilters.size > 0, stateFilter !== "all", specialtyFilters.length > 0, feeFilter !== "all", firmFilter !== "all", minRating > 0, verifiedOnly, internationalOnly, isLocationActive].filter(Boolean).length;

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
    setVerifiedOnly(false); setInternationalOnly(false); setSearch(""); setSortBy("rating");
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

        <div className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-white to-slate-50/80 border border-slate-200 rounded-2xl p-4 md:p-8 mb-4 md:mb-6 shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-300 via-amber-500 to-amber-300" />
          <h1 className="text-xl md:text-4xl font-extrabold mb-1.5 md:mb-3 text-slate-900 tracking-tight">{dynamicTitle}</h1>
          <p className="text-xs md:text-base text-slate-500 mb-4 md:mb-6 max-w-2xl leading-relaxed">
            <span className="md:hidden">{dynamicDescription.slice(0, 70)}…</span>
            <span className="hidden md:inline">{dynamicDescription}</span>
          </p>
          <div className="flex items-center gap-2 md:gap-3 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full shadow-sm text-[0.65rem] md:text-xs font-semibold text-slate-700">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="font-bold text-slate-900">{professionals.length}</span> advisors listed
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-full shadow-sm text-[0.65rem] md:text-xs font-semibold text-slate-600">
              <Icon name="shield" size={13} className="text-amber-500" />ASIC verified
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-full shadow-sm text-[0.65rem] md:text-xs font-semibold text-slate-600">
              <Icon name="clock" size={13} className="text-amber-500" />Free consultation
            </div>
          </div>
        </div>

        {/* Compare bar */}
        {shortlistCount > 0 && (
          <div className="sticky top-16 z-30 mb-3">
            <div className="bg-violet-600 text-white rounded-xl px-4 py-2.5 flex items-center justify-between shadow-lg shadow-violet-200">
              <span className="text-sm font-semibold">
                {shortlistCount} advisor{shortlistCount !== 1 ? "s" : ""} saved
                {shortlistCount === 1 && <span className="text-violet-200 font-normal"> — save 1 more to compare</span>}
              </span>
              <div className="flex items-center gap-2">
                <Link href="/shortlist/advisors" className="px-3 py-1.5 text-violet-200 text-xs font-semibold hover:text-white transition-colors">
                  View saved
                </Link>
                {shortlistCount >= 2 ? (
                  <Link href="/advisors/compare" className="px-3 py-1.5 bg-white text-violet-700 text-xs font-bold rounded-lg hover:bg-violet-50 transition-colors">
                    Compare {shortlistCount} →
                  </Link>
                ) : (
                  <span className="text-xs text-violet-200">{shortlistMax - shortlistCount} more to compare</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Search + Filter bar */}
        <div className="flex gap-2 mb-3 md:mb-4">
          <div className="relative flex-1">
            <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search name, firm, specialty, suburb..." value={search} onChange={e => setSearch(e.target.value)} aria-label="Search advisors" className="w-full pl-9 pr-4 py-2.5 md:py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 transition-all" />
            {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><Icon name="x" size={16} /></button>}
          </div>
          <button onClick={() => setFiltersOpen(!filtersOpen)} className={`flex items-center gap-1.5 px-3 md:px-4 py-2.5 border rounded-xl text-sm font-semibold transition-all shrink-0 ${filtersOpen || activeFilterCount > 0 ? "bg-amber-50 border-amber-300 text-amber-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
            <Icon name="sliders" size={16} />
            <span className="hidden md:inline">Filters</span>
            {activeFilterCount > 0 && <span className="w-5 h-5 bg-amber-600 text-white text-[0.6rem] font-bold rounded-full flex items-center justify-center">{activeFilterCount}</span>}
          </button>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as SortKey)} className="hidden md:block px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30">
            {SORT_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </div>

        {/* Filter panel */}
        {filtersOpen && (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 mb-4 md:mb-6 space-y-4">
            {/* Location / Near me */}
            <div>
              <label className="text-xs font-bold text-slate-700 mb-2 block flex items-center gap-1.5">
                <Icon name="map-pin" size={13} className="text-amber-500" />
                Location
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="md:col-span-2">
                  <LocationSearch selected={locationSearch} onSelect={(p) => { setLocationSearch(p); if (!p) { setUserLat(null); setUserLng(null); } }} />
                </div>
                <div className="flex items-center gap-2">
                  <select value={radius} onChange={e => setRadius(Number(e.target.value))} className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30" disabled={!isLocationActive}>
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
                  <button key={f.key} onClick={() => toggleType(f.key)} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${(f.key === "all" ? typeFilters.size === 0 : typeFilters.has(f.key as ProfessionalType)) ? "bg-amber-600 text-white shadow-sm" : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"}`}>
                    <Icon name={f.icon} size={13} className={(f.key === "all" ? typeFilters.size === 0 : typeFilters.has(f.key as ProfessionalType)) ? "text-amber-200" : "text-slate-400"} />
                    {f.label}
                    {typeCounts[f.key] ? <span className={(f.key === "all" ? typeFilters.size === 0 : typeFilters.has(f.key as ProfessionalType)) ? "text-amber-200" : "text-slate-400"}>({typeCounts[f.key]})</span> : null}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">State</label>
                <select value={stateFilter} onChange={e => setStateFilter(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30" disabled={isLocationActive}>
                  <option value="all">All States</option>
                  {AU_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">Fee Structure</label>
                <select value={feeFilter} onChange={e => setFeeFilter(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30">
                  <option value="all">Any</option>
                  <option value="fee-for-service">Fee for Service</option>
                  <option value="commission">Commission</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="percentage of AUM">% of AUM</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">Advisory Firm</label>
                <select value={firmFilter} onChange={e => setFirmFilter(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30">
                  <option value="all">All Firms</option>
                  {allFirmNames.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">Min Rating</label>
                <select value={minRating} onChange={e => setMinRating(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30">
                  <option value={0}>Any</option>
                  <option value={4.5}>4.5+ ★</option>
                  <option value={4.0}>4.0+ ★</option>
                  <option value={3.5}>3.5+ ★</option>
                  <option value={3.0}>3.0+ ★</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">Sort By</label>
                <select value={sortBy} onChange={e => setSortBy(e.target.value as SortKey)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30">
                  {SORT_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer py-2">
                  <input type="checkbox" checked={verifiedOnly} onChange={() => setVerifiedOnly(!verifiedOnly)} className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500" />
                  <span className="text-xs font-semibold text-slate-700">Verified only</span>
                </label>
              </div>
            </div>

            {/* International clients filter */}
            <div className="border border-blue-200 bg-blue-50 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-base leading-none">🌏</span>
                <div>
                  <p className="text-xs font-bold text-blue-900">International clients</p>
                  <p className="text-[0.65rem] text-blue-700">Show only advisors who accept overseas or expat clients (FIRB, cross-border tax, non-resident loans)</p>
                </div>
              </div>
              <button
                onClick={() => setInternationalOnly(!internationalOnly)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus:outline-none ${internationalOnly ? "bg-blue-600" : "bg-slate-300"}`}
                role="switch"
                aria-checked={internationalOnly}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 mt-0.5 ${internationalOnly ? "translate-x-4 ml-0.5" : "translate-x-0.5"}`} />
              </button>
            </div>

            {/* Specialties */}
            <div>
              <label className="text-xs font-bold text-slate-700 mb-2 block">Specialties {specialtyFilters.length > 0 && <span className="text-amber-600">({specialtyFilters.length} selected)</span>}</label>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                {allSpecialties.map(s => (
                  <button key={s} onClick={() => toggleSpecialty(s)} className={`px-2.5 py-1 text-[0.65rem] font-medium rounded-full transition-all ${specialtyFilters.includes(s) ? "bg-amber-100 text-amber-700 border border-amber-300" : "bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100"}`}>{s}</button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button onClick={clearAll} className="text-xs text-slate-500 hover:text-slate-700 font-medium">Clear all filters</button>
              <button onClick={() => setFiltersOpen(false)} className="px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 transition-colors">
                {nearbyLoading ? "Searching..." : `Show ${filtered.length} result${filtered.length !== 1 ? "s" : ""}`}
              </button>
            </div>
          </div>
        )}

        {/* Active filter chips */}
        {activeFilterCount > 0 && !filtersOpen && (
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            {isLocationActive && locationSearch && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 text-[0.65rem] font-semibold rounded-full">
                <Icon name="map-pin" size={11} />
                {radius > 0 ? `${radius}km from ` : "Near "}{locationSearch.locality}
                <button onClick={() => { setLocationSearch(null); setUserLat(null); setUserLng(null); }} className="hover:text-amber-900"><Icon name="x" size={12} /></button>
              </span>
            )}
            {Array.from(typeFilters).map(t => (
              <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 text-[0.65rem] font-semibold rounded-full">
                {TYPE_FILTERS.find(f => f.key === t)?.label}
                <button onClick={() => toggleType(t)} className="hover:text-amber-900"><Icon name="x" size={12} /></button>
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
            {internationalOnly && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 text-[0.65rem] font-semibold rounded-full">
                🌏 International clients
                <button onClick={() => setInternationalOnly(false)} className="hover:text-blue-900"><Icon name="x" size={12} /></button>
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
                firmFilter === "all" ? "bg-amber-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Advisors ({professionals.length})
            </button>
            {firms.map(firm => (
              <button
                key={firm.id}
                onClick={() => setFirmFilter(firm.name)}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                  firmFilter === firm.name ? "bg-amber-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <span className="w-5 h-5 rounded bg-amber-100 flex items-center justify-center text-[0.5rem] font-bold text-amber-600 shrink-0">
                  {firm.name.split(/\s+/).slice(0, 2).map((w: string) => w[0]).join("").toUpperCase()}
                </span>
                {firm.name}
                <span className={`text-xs ${firmFilter === firm.name ? "text-amber-200" : "text-slate-400"}`}>({firmMemberCounts[firm.id] || 0})</span>
              </button>
            ))}
          </div>
        )}

        {/* Firm detail card — shown when a firm is selected */}
        {firmFilter !== "all" && (() => {
          const selectedFirm = firms.find((f: AdvisorFirm) => f.name === firmFilter);
          if (!selectedFirm) return null;
          return (
            <div className="bg-white border border-amber-200 rounded-xl p-4 md:p-5 mb-4 flex flex-col md:flex-row gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-100 to-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                  {selectedFirm.logo_url ? (
                    <Image src={selectedFirm.logo_url} alt={selectedFirm.name} width={56} height={56} className="w-full h-full object-contain rounded-xl" />
                  ) : (
                    <span className="text-lg font-bold text-amber-600">
                      {selectedFirm.name.split(/\s+/).slice(0, 2).map((w: string) => w[0]).join("").toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-slate-900">{selectedFirm.name}</h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-xs text-slate-500">
                    {selectedFirm.location_display && <span className="flex items-center gap-1"><Icon name="map-pin" size={11} className="text-slate-400" />{selectedFirm.location_display}</span>}
                    {selectedFirm.afsl_number && <span className="flex items-center gap-1"><Icon name="shield" size={11} className="text-amber-400" />AFSL {selectedFirm.afsl_number}</span>}
                    <span className="flex items-center gap-1"><Icon name="users" size={11} className="text-blue-400" />{firmMemberCounts[selectedFirm.id] || 0} advisors</span>
                  </div>
                  {selectedFirm.bio && <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{selectedFirm.bio}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link href={`/firm/${selectedFirm.slug}`} className="px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 transition-colors">
                  View Firm Profile →
                </Link>
              </div>
            </div>
          );
        })()}

        {/* Results */}
        {nearbyLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white border border-slate-100 rounded-2xl p-4 md:p-5 animate-pulse shadow-sm">
                <div className="flex gap-4">
                  <div className="w-[60px] h-[60px] md:w-[80px] md:h-[80px] rounded-2xl bg-slate-100 shrink-0" />
                  <div className="flex-1 space-y-2.5 py-1">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-36 bg-slate-100 rounded-full" />
                      <div className="h-4 w-16 bg-slate-50 rounded-full" />
                    </div>
                    <div className="h-3 w-24 bg-slate-50 rounded-full" />
                    <div className="flex gap-1.5">
                      <div className="h-5 w-20 bg-slate-50 rounded-full" />
                      <div className="h-5 w-28 bg-slate-50 rounded-full" />
                    </div>
                    <div className="flex gap-1">
                      <div className="h-4 w-16 bg-slate-50 rounded-full" />
                      <div className="h-4 w-20 bg-slate-50 rounded-full" />
                      <div className="h-4 w-14 bg-slate-50 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : paginatedResults.length > 0 ? (
          <div className="space-y-3">
            {paginatedResults.map(pro => {
              const isFeatured = !!(pro.featured_until && new Date(pro.featured_until) > new Date());
              return (
                <Link key={pro.id} href={`/advisor/${pro.slug}`} className={`group block bg-white rounded-2xl transition-all duration-200 overflow-hidden ${
                  isFeatured
                    ? "shadow-md shadow-amber-50 hover:shadow-xl hover:shadow-amber-100/50 hover:-translate-y-0.5 ring-1 ring-amber-200/80 border border-amber-200"
                    : "shadow-sm border border-slate-100 hover:shadow-md hover:shadow-slate-100 hover:-translate-y-0.5 hover:border-slate-200"
                }`}>
                  {isFeatured && (
                    <div className="h-0.5 bg-gradient-to-r from-amber-300 via-amber-500 to-amber-300" />
                  )}
                  <div className="p-4 md:p-5 flex gap-4">
                    {/* Photo */}
                    <div className="relative shrink-0">
                      {pro.photo_url ? (
                        <div className="w-[60px] h-[60px] md:w-[80px] md:h-[80px] rounded-2xl overflow-hidden ring-2 ring-slate-100 shadow-sm">
                          <Image src={pro.photo_url} alt={pro.name} width={80} height={80} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-[60px] h-[60px] md:w-[80px] md:h-[80px] rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-bold text-xl md:text-2xl shadow-md shadow-amber-200/60 select-none">
                          {pro.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      {pro.verified && (
                        <div className="absolute -bottom-1 -right-1 w-[18px] h-[18px] bg-amber-500 rounded-full border-2 border-white flex items-center justify-center shadow-sm">
                          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Name + badges row */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-[15px] md:text-base text-slate-900 leading-tight">{pro.name}</span>
                            {pro.verified && (
                              <span className="shrink-0 text-[0.58rem] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-0.5">
                                <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                Verified
                              </span>
                            )}
                            {isFeatured && (
                              <span className="shrink-0 text-[0.58rem] font-bold px-1.5 py-0.5 rounded-full bg-amber-500 text-white flex items-center gap-0.5 shadow-sm">
                                <Icon name="star" size={9} />
                                Featured
                              </span>
                            )}
                            {pro.avg_response_minutes != null && pro.avg_response_minutes <= 120 && (
                              <span className="shrink-0 text-[0.58rem] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-0.5">
                                <Icon name="zap" size={9} className="text-emerald-500" />
                                Fast reply
                              </span>
                            )}
                            {pro.accepts_international_clients && (
                              <span className="shrink-0 text-[0.58rem] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">🌏 Intl</span>
                            )}
                            {pro.firb_specialist && (
                              <span className="shrink-0 text-[0.58rem] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">FIRB</span>
                            )}
                          </div>
                          {pro.firm_name && (
                            <p className="text-[0.68rem] md:text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                              <Icon name="building" size={10} className="text-slate-400 shrink-0" />
                              <span className="truncate">{pro.firm_name}</span>
                            </p>
                          )}
                        </div>
                        <button
                          onClick={(e) => { e.preventDefault(); toggleShortlist(pro.slug); }}
                          disabled={!inShortlist(pro.slug) && shortlistCount >= shortlistMax}
                          title={inShortlist(pro.slug) ? "Remove from compare" : shortlistCount >= shortlistMax ? "Compare list full" : "Save to compare"}
                          className={`shrink-0 p-1.5 rounded-lg transition-colors ${inShortlist(pro.slug) ? "text-violet-600 bg-violet-50 hover:bg-violet-100" : shortlistCount >= shortlistMax ? "text-slate-200 cursor-not-allowed" : "text-slate-300 hover:text-violet-500 hover:bg-violet-50"}`}
                        >
                          <Icon name={inShortlist(pro.slug) ? "bookmark-check" : "bookmark"} size={15} />
                        </button>
                      </div>

                      {/* Type + Location row */}
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <span className="shrink-0 text-[0.65rem] text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full font-semibold">{PROFESSIONAL_TYPE_LABELS[pro.type]}</span>
                        {pro.account_type === "firm_member" ? (
                          <span className="shrink-0 text-[0.6rem] font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                            <Icon name="users" size={9} className="text-blue-400" />Firm
                          </span>
                        ) : !pro.firm_name ? (
                          <span className="shrink-0 text-[0.6rem] font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded-full">Independent</span>
                        ) : null}
                        {pro.location_display && (
                          <span className="text-[0.65rem] text-slate-500 flex items-center gap-0.5">
                            <Icon name="map-pin" size={10} className="text-slate-400" />{pro.location_display}
                          </span>
                        )}
                        {pro.distance_km !== undefined && pro.distance_km !== null && (
                          <span className="shrink-0 text-[0.65rem] font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                            {pro.distance_km < 1 ? "<1 km" : `${pro.distance_km} km`}
                          </span>
                        )}
                      </div>

                      {/* Rating */}
                      {pro.rating > 0 && pro.review_count > 0 && (
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map(star => (
                              <svg key={star} className={`w-3 h-3 md:w-3.5 md:h-3.5 ${star <= Math.round(pro.rating) ? "text-amber-400" : "text-slate-200"}`} fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                          <span className="text-[0.68rem] md:text-xs font-semibold text-slate-700">{pro.rating}</span>
                          <span className="text-[0.62rem] text-slate-400">({pro.review_count} review{pro.review_count !== 1 ? "s" : ""})</span>
                        </div>
                      )}

                      {/* Fee description */}
                      {pro.fee_description && (
                        <p className="text-[0.65rem] md:text-xs text-slate-500 mt-1.5 line-clamp-1 leading-relaxed">{pro.fee_description}</p>
                      )}

                      {/* Structured fees */}
                      {(pro.hourly_rate_cents || pro.flat_fee_cents || pro.aum_percentage || pro.initial_consultation_free) && (
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          {pro.hourly_rate_cents && (
                            <span className="text-[0.6rem] text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full font-medium">
                              {formatCents(pro.hourly_rate_cents)}/hr
                            </span>
                          )}
                          {pro.flat_fee_cents && (
                            <span className="text-[0.6rem] text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full font-medium">
                              {formatCents(pro.flat_fee_cents)} flat
                            </span>
                          )}
                          {pro.aum_percentage && (
                            <span className="text-[0.6rem] text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full font-medium">
                              {pro.aum_percentage}% AUM
                            </span>
                          )}
                          {pro.initial_consultation_free && (
                            <span className="text-[0.6rem] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">
                              Free consult
                            </span>
                          )}
                        </div>
                      )}

                      {/* Specialties */}
                      {pro.specialties.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {pro.specialties.slice(0, 4).map(s => (
                            <span key={s} className={`text-[0.6rem] font-medium px-2 py-0.5 rounded-full border ${
                              specialtyFilters.includes(s)
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-slate-50 text-slate-500 border-slate-200"
                            }`}>{s}</span>
                          ))}
                          {pro.specialties.length > 4 && (
                            <span className="text-[0.6rem] text-slate-400 self-center">+{pro.specialties.length - 4} more</span>
                          )}
                        </div>
                      )}

                      {/* Offer */}
                      {pro.offer_active && pro.offer_text && (
                        <div className="mt-2 bg-gradient-to-r from-amber-50 to-amber-50/0 border border-amber-200 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
                          <Icon name="tag" size={11} className="text-amber-500 shrink-0" />
                          <span className="text-[0.6rem] md:text-[0.65rem] font-bold text-amber-700 truncate">{pro.offer_text}</span>
                        </div>
                      )}
                    </div>

                    {/* Right arrow */}
                    <div className="shrink-0 self-center hidden md:flex ml-1">
                      <div className="w-8 h-8 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center group-hover:bg-amber-50 group-hover:border-amber-200 transition-all">
                        <Icon name="chevron-right" size={14} className="text-slate-400 group-hover:text-amber-500 transition-colors" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="text-center py-8 px-4 border-b border-slate-100">
              <Icon name="search" size={32} className="text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-600 mb-1">No advisors found</p>
              <p className="text-xs text-slate-400 mb-3">
                {isLocationActive ? `No advisors within ${radius}km. Try a larger radius.` : search ? `No results for "${search}".` : "Try adjusting your filters."}
              </p>
              <button onClick={clearAll} className="text-xs text-amber-600 font-semibold hover:text-amber-800">Clear all filters</button>
            </div>
            {/* Alert capture */}
            <div className="px-5 py-5 bg-amber-50">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
                  <Icon name="bell" size={16} className="text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Get notified when one joins</p>
                  <p className="text-xs text-slate-500 mt-0.5">Enter your email and we&apos;ll alert you when a matching advisor joins Invest.com.au.</p>
                </div>
              </div>
              {alertStatus === "done" ? (
                <div className="flex items-center gap-2 text-sm text-emerald-700 font-semibold">
                  <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  Alert saved! We&apos;ll email you when a match is available.
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={alertEmail}
                    onChange={(e) => { setAlertEmail(e.target.value); setAlertError(""); }}
                    placeholder="your@email.com"
                    className="flex-1 px-3 py-2 border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                    onKeyDown={(e) => e.key === "Enter" && saveAlert()}
                  />
                  <button
                    onClick={saveAlert}
                    disabled={alertStatus === "submitting"}
                    className="px-4 py-2 bg-amber-500 text-white text-sm font-semibold rounded-lg hover:bg-amber-600 disabled:opacity-60 transition-colors whitespace-nowrap"
                  >
                    {alertStatus === "submitting" ? "Saving..." : "Notify Me"}
                  </button>
                </div>
              )}
              {alertError && <p className="text-xs text-red-600 mt-1">{alertError}</p>}
            </div>
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
              return <button key={pn} onClick={() => setPage(pn)} className={`w-9 h-9 text-xs font-semibold rounded-lg transition-all ${page === pn ? "bg-amber-600 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{pn}</button>;
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">Next {"\u2192"}</button>
          </div>
        )}

        {/* Editorial content */}
        {editorial && (
          <section className="mt-8 md:mt-12 space-y-4">
            <div className="bg-white border border-slate-100 rounded-2xl p-5 md:p-7 shadow-sm">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                  <Icon name="check-circle" size={16} className="text-emerald-600" />
                </div>
                <h2 className="text-base md:text-lg font-extrabold text-slate-900">How to Choose the Right {pageTitle?.replace(' in Australia', '') || 'Professional'}</h2>
              </div>
              <ul className="space-y-3">
                {editorial.howToChoose.map((tip, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-600 leading-relaxed">
                    <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 text-xs font-bold mt-0.5 shadow-sm shadow-emerald-200">{i + 1}</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-amber-50/80 via-white to-white border border-amber-100 rounded-2xl p-5 md:p-6 shadow-sm">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                    <Icon name="dollar-sign" size={15} className="text-amber-700" />
                  </div>
                  <h2 className="text-base md:text-lg font-extrabold text-slate-900">Cost Guide</h2>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">{editorial.costGuide}</p>
              </div>
              <div className="bg-gradient-to-br from-blue-50/60 via-white to-white border border-blue-100 rounded-2xl p-5 md:p-6 shadow-sm">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                    <Icon name="trending-up" size={15} className="text-blue-700" />
                  </div>
                  <h2 className="text-base md:text-lg font-extrabold text-slate-900">Industry Insight</h2>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">{editorial.industryInsight}</p>
              </div>
            </div>
          </section>
        )}

        {/* FAQs */}
        {faqs.length > 0 && (
          <div className="mt-8 md:mt-12">
            <h2 className="text-base md:text-xl font-extrabold text-slate-900 mb-3 md:mb-4">Frequently Asked Questions</h2>
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden divide-y divide-slate-100">
              {faqs.map((faq, i) => (
                <details key={i} className="group">
                  <summary className="px-4 py-3.5 md:px-5 md:py-4 font-semibold text-xs md:text-sm text-slate-800 cursor-pointer hover:bg-slate-50/80 transition-colors list-none flex items-center justify-between gap-3">
                    <span>{faq.q}</span>
                    <span className="shrink-0 w-5 h-5 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400 group-open:bg-amber-50 group-open:border-amber-200 group-open:text-amber-600 transition-all">
                      <svg className="w-2.5 h-2.5 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                    </span>
                  </summary>
                  <p className="px-4 pb-4 md:px-5 md:pb-5 text-xs md:text-sm text-slate-600 leading-relaxed border-t border-slate-50 pt-2 bg-slate-50/40">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        )}

        {/* Advisor guides */}
        <div className="mt-6 md:mt-8">
          <h2 className="text-sm md:text-base font-extrabold text-slate-900 mb-2 md:mb-3">Advisor Guides</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-2.5">
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
              <Link key={g.href} href={g.href} className="group flex items-center gap-2.5 p-3 bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md hover:border-amber-100 hover:bg-amber-50/30 transition-all">
                <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 group-hover:bg-amber-100 group-hover:border-amber-200 transition-all">
                  <Icon name={g.icon} size={14} className="text-slate-500 group-hover:text-amber-600 transition-colors" />
                </div>
                <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-800 leading-tight">How to Choose: {g.title}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Saved search / alert widget */}
        <div className="mt-6 md:mt-8 bg-gradient-to-br from-amber-50/80 via-white to-white border border-amber-100 rounded-2xl p-4 md:p-6 shadow-sm">
          <div className="flex items-start gap-3 mb-3.5">
            <div className="w-10 h-10 bg-amber-100 border border-amber-200 rounded-xl flex items-center justify-center shrink-0 shadow-sm shadow-amber-100">
              <Icon name="bell" size={18} className="text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-800">Can&apos;t find the right advisor?</h3>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">Save a search alert and we&apos;ll notify you when a new advisor matching your criteria joins.</p>
            </div>
          </div>
          {alertStatus === "done" ? (
            <div className="flex items-center gap-2 text-sm text-emerald-700 font-semibold">
              <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
              Alert saved — we&apos;ll email you when a match is available.
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="email"
                value={alertEmail}
                onChange={(e) => { setAlertEmail(e.target.value); setAlertError(""); }}
                placeholder="your@email.com"
                className="flex-1 px-3 py-2 border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                onKeyDown={(e) => e.key === "Enter" && saveAlert()}
              />
              <button
                onClick={saveAlert}
                disabled={alertStatus === "submitting"}
                className="px-4 py-2 bg-amber-500 text-white text-sm font-semibold rounded-lg hover:bg-amber-600 disabled:opacity-60 transition-colors whitespace-nowrap"
              >
                {alertStatus === "submitting" ? "Saving..." : "Set Alert"}
              </button>
            </div>
          )}
          {alertError && <p className="text-xs text-red-600 mt-1">{alertError}</p>}
        </div>

        <div className="mt-6 md:mt-10 relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-5 md:p-8 text-center shadow-xl shadow-slate-900/10">
          <div className="absolute inset-0 opacity-5" style={{backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '32px 32px'}} />
          <div className="relative">
            <p className="text-[0.65rem] font-bold uppercase tracking-widest text-amber-400 mb-2">For Professionals</p>
            <h3 className="text-base md:text-xl font-extrabold text-white mb-1.5 md:mb-2">Are you a financial professional?</h3>
            <p className="text-xs md:text-sm text-slate-400 mb-4 md:mb-5">List your practice for free. Only pay when you receive an enquiry.</p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link href="/advisor-apply" className="inline-flex items-center gap-2 px-5 py-2.5 md:px-6 md:py-3 bg-amber-500 text-white text-sm font-bold rounded-xl hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/25">
                Get Listed Free
                <Icon name="arrow-right" size={15} />
              </Link>
              <Link href="/advisor-portal" className="inline-flex items-center gap-2 px-5 py-2.5 md:px-6 md:py-3 border border-slate-600 text-slate-300 text-sm font-semibold rounded-xl hover:bg-slate-700/50 hover:border-slate-500 transition-colors">
                Advisor Login
                <Icon name="arrow-right" size={15} />
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-4 md:mt-6 text-[0.58rem] md:text-xs text-slate-400 text-center leading-relaxed">
          <p>All advisors listed are verified against the ASIC Financial Advisers Register or Tax Practitioners Board. Invest.com.au does not provide financial advice. Selecting an advisor is your decision &mdash; we facilitate the connection only.</p>
        </div>
      </div>
    </div>
  );
}
