"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useMemo, useEffect, useCallback, useRef, type ReactNode } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import GetMatchedEmbed from "@/components/get-matched/GetMatchedEmbed";
import DirectoryHero from "@/components/directory/DirectoryHero";
import type { Professional, ProfessionalType, AdvisorFirm } from "@/lib/types";
import EligibilityBadge from "@/components/EligibilityBadge";
import { PROFESSIONAL_TYPE_LABELS, PROFESSIONAL_TYPE_ICONS, AU_STATES, AU_LANGUAGES } from "@/lib/types";
import Icon from "@/components/Icon";
import VerifiedBadge from "@/components/VerifiedBadge";
import { trackEvent } from "@/lib/tracking";
import { useAdvisorShortlist } from "@/lib/hooks/useAdvisorShortlist";
import { SPONSORED_DISCLOSURE_SHORT } from "@/lib/compliance";
import BookmarkButton from "@/components/BookmarkButton";
import SearchInput from "@/components/directory/SearchInput";
import SortDropdown from "@/components/directory/SortDropdown";
import TabBar from "@/components/directory/TabBar";
import FilterChips from "@/components/directory/FilterChips";
import FilterPanel from "@/components/directory/FilterPanel";
import FilterGroupHeader from "@/components/directory/FilterGroupHeader";
import FacetGroup from "@/components/directory/FacetGroup";
import ResultCount from "@/components/directory/ResultCount";
import EmptyState from "@/components/directory/EmptyState";
import CompareBar from "@/components/directory/CompareBar";
import { FilterPill, FilterPopover } from "@/components/directory/FilterPill";
import SmartFilterBar from "@/components/directory/SmartFilterBar";
import { INTENT_COUNTRY_COOKIE, isKnownIntentCountry, type IntentCountryCode } from "@/lib/intent-context";
import { setIntentCountryAction } from "@/lib/intent-context-actions";
import { isEligibleForCountry } from "@/lib/country-mode/eligibility-filter";

export interface ExpertTeamCard {
  id: number;
  slug: string;
  name: string;
  team_category: string;
  team_type: string;
  description: string | null;
  location_state: string | null;
  accepted_brief_templates: string[] | null;
}

type ProviderType = "all" | "individual" | "firm" | "team";

const PROVIDER_TYPE_LABELS: Record<Exclude<ProviderType, "all">, string> = {
  individual: "Individuals",
  firm: "Firms",
  team: "Expert Teams",
};

/**
 * Derived from PROFESSIONAL_TYPE_LABELS so a new type added to the
 * union automatically appears in the filter. Sorted alphabetically
 * for predictable UX. The plural suffix is best-effort: most labels
 * are singular ("Mining Lawyer") so we append "s" except where the
 * label already ends in 's' (e.g. "Buyers Agent" → "Buyers Agents"
 * just adds 's' which is still correct).
 */
const TYPE_FILTERS: { key: ProfessionalType | "all"; label: string; icon: string }[] = [
  { key: "all", label: "All Types", icon: "users" },
  ...(Object.keys(PROFESSIONAL_TYPE_LABELS) as ProfessionalType[])
    .map((key) => ({
      key,
      label: `${PROFESSIONAL_TYPE_LABELS[key]}s`.replace(/ss$/, "s"),
      icon: PROFESSIONAL_TYPE_ICONS[key] ?? "user",
    }))
    .sort((a, b) => a.label.localeCompare(b.label)),
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

const FEE_OPTIONS = [
  { value: "all", label: "Any fee" },
  { value: "fee-for-service", label: "Fee for Service" },
  { value: "commission", label: "Commission" },
  { value: "hybrid", label: "Hybrid" },
  { value: "percentage of AUM", label: "% of AUM" },
];
const RATING_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "Any rating" },
  { value: 4.5, label: "4.5+ ★" },
  { value: 4, label: "4.0+ ★" },
  { value: 3.5, label: "3.5+ ★" },
  { value: 3, label: "3.0+ ★" },
];

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
        <Icon name="map-pin" size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); search(e.target.value); }}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Suburb or postcode..."
          className="w-full pl-8 pr-8 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
        />
        {selected && (
          <button onClick={() => { setQuery(""); onSelect(null); setResults([]); }} aria-label="Clear location" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-600">
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
              <span className="text-xs text-slate-500">{p.postcode}</span>
            </button>
          ))}
        </div>
      )}
      {open && results.length === 0 && query.length >= 2 && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg p-3">
          <p className="text-xs text-slate-500">No locations found</p>
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

/**
 * Advisor photo for the photo-led card header. Seed photos come from a
 * third-party CDN (randomuser.me) that can be unreachable on some networks;
 * on a load error we fall back to the coral initials tile so the header
 * never renders blank. Also used when a professional has no photo_url.
 */
function AdvisorPhoto({
  src,
  alt,
  initials,
  priority,
}: {
  src: string | null | undefined;
  alt: string;
  initials: string;
  priority: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-coral-400 to-coral-600 flex items-center justify-center text-white font-extrabold text-4xl select-none">
        {initials}
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(max-width: 640px) 100vw, (max-width: 1280px) 33vw, 320px"
      className="object-cover"
      priority={priority}
      onError={() => setFailed(true)}
      placeholder="blur"
      blurDataURL="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxyZWN0IHdpZHRoPSI4IiBoZWlnaHQ9IjgiIGZpbGw9IiNlMmU4ZjAiLz48L3N2Zz4="
    />
  );
}

export default function AdvisorsClient({ professionals, initialType, initialState, pageTitle, pageDescription, faqs = [], editorial, firms = [], firmMemberCounts = {}, expertTeams = [], intentCountry = null, banners = null }: {
  professionals: Professional[];
  initialType?: ProfessionalType;
  initialState?: string;
  pageTitle?: string;
  pageDescription?: string;
  faqs?: { q: string; a: string }[];
  editorial?: { howToChoose: string[]; costGuide: string; industryInsight: string };
  firms?: AdvisorFirm[];
  firmMemberCounts?: Record<number, number>;
  expertTeams?: ExpertTeamCard[];
  /** PR queue #12.5 — visitor's resolved intent country. When set, every advisor card renders an EligibilityBadge based on country_eligibility. */
  intentCountry?: import("@/lib/intent-context").IntentCountryCode | null;
  /** Server-rendered country banner stack, passed through so it can render in the
      canonical slot directly below the shared DirectoryHero (matches /invest, /compare). */
  banners?: ReactNode;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const trackedRef = useRef(false);

  useEffect(() => {
    if (trackedRef.current) return;
    trackedRef.current = true;
    trackEvent('advisor_directory_view', {
      total_advisors: professionals.length,
      total_firms: firms.length,
      total_teams: expertTeams.length,
      initial_type: initialType || 'all',
      initial_state: initialState || 'all',
    }, '/advisors');
  }, [professionals.length, firms.length, expertTeams.length, initialType, initialState]);

  const [providerType, setProviderType] = useState<ProviderType>("all");
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
  const [languageFilter, setLanguageFilter] = useState<string>("all");
  const [acceptingOnly, setAcceptingOnly] = useState(false);
  const [videoOnly, setVideoOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("rating");
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [openPill, setOpenPill] = useState<string | null>(null);

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
    const pt = searchParams.get("provider_type");
    if (pt === "individual" || pt === "firm" || pt === "team") setProviderType(pt);

    // specialty / sort / q / language are orthogonal to the route-derived
    // type+state, so honour them on route-scoped pages too — country hubs
    // deep-link /advisors/international-tax-specialists?specialty=UK%20Pension%20Transfer
    // and vertical hubs deep-link /advisors/mortgage-brokers?specialty=First+Home+Buyers.
    // (These were previously dropped behind the initialType early-return.)
    const sp = searchParams.get("specialty");
    const sort = searchParams.get("sort");
    const q = searchParams.get("q");
    const lang = searchParams.get("language");
    if (sp) setSpecialtyFilters(sp.split(","));
    if (sort) setSortBy(sort as SortKey);
    if (q) setSearch(q);
    if (lang) setLanguageFilter(lang);

    // Only type/state must never override the route-derived scope.
    if (initialType || initialState) return;
    const t = searchParams.get("type");
    const s = searchParams.get("state");
    if (t) {
      const types = t.split(",").filter(v => TYPE_FILTERS.some(f => f.key === v)) as ProfessionalType[];
      if (types.length > 0) setTypeFilters(new Set(types));
    }
    if (s && AU_STATES.includes(s as typeof AU_STATES[number])) setStateFilter(s);
  }, [searchParams, initialType, initialState]);

  // ── Country context (cross-border funnel) ──────────────────────────────
  // The main /advisors page resolves the intent country server-side (cookie)
  // and passes it as a prop; the route-scoped ISR pages ([type] and the
  // specialist hubs) can't read cookies without losing ISR, so resolve it
  // client-side: explicit ?country= deep-link (from the country-hub CTAs)
  // beats the remembered cookie. An explicit deep-link is also persisted,
  // so the rest of the journey stays country-aware.
  const urlCountryRaw = searchParams.get("country");
  const urlCountry: IntentCountryCode | null =
    urlCountryRaw && isKnownIntentCountry(urlCountryRaw) ? urlCountryRaw : null;
  const [cookieCountry, setCookieCountry] = useState<IntentCountryCode | null>(null);
  useEffect(() => {
    if (intentCountry || urlCountry) return; // higher-priority source available
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${INTENT_COUNTRY_COOKIE}=([^;]+)`));
    const value = match?.[1];
    if (value && isKnownIntentCountry(value)) setCookieCountry(value);
  }, [intentCountry, urlCountry]);
  useEffect(() => {
    if (urlCountry && urlCountry !== intentCountry) void setIntentCountryAction(urlCountry);
  }, [urlCountry, intentCountry]);
  const effectiveCountry: IntentCountryCode | null = intentCountry ?? urlCountry ?? cookieCountry;

  const initialRenderRef = useRef(true);

  const updateURL = useCallback(() => {
    const params = new URLSearchParams();
    if (providerType !== "all") params.set("provider_type", providerType);
    if (typeFilters.size > 0) params.set("type", Array.from(typeFilters).join(","));
    if (stateFilter !== "all") params.set("state", stateFilter);
    if (specialtyFilters.length) params.set("specialty", specialtyFilters.join(","));
    if (languageFilter !== "all") params.set("language", languageFilter);
    if (sortBy !== "rating") params.set("sort", sortBy);
    if (search) params.set("q", search);
    const qs = params.toString();
    const newPath = `/advisors${qs ? `?${qs}` : ""}`;
    // Skip if URL hasn't changed (prevents initial load re-render cycle)
    const currentQs = searchParams.toString();
    if (qs === currentQs) return;
    router.replace(newPath, { scroll: false });
  }, [providerType, typeFilters, stateFilter, specialtyFilters, languageFilter, sortBy, search, router, searchParams]);

  useEffect(() => {
    // Skip the very first render to prevent immediate router.replace on page load
    if (initialRenderRef.current) {
      initialRenderRef.current = false;
      return;
    }
    const t = setTimeout(updateURL, 300);
    return () => clearTimeout(t);
  }, [updateURL]);

  useEffect(() => { setPage(1); }, [providerType, typeFilters, stateFilter, specialtyFilters, feeFilter, firmFilter, minRating, verifiedOnly, internationalOnly, languageFilter, acceptingOnly, videoOnly, search, sortBy, nearbyResults]);

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

  const stateCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const bump = (s?: string | null) => { if (s) counts[s] = (counts[s] || 0) + 1; };
    // Count every provider type the Location pill can surface — a state with
    // only firms or expert teams (no individual advisors) stays selectable.
    professionals.forEach((p) => bump(p.location_state));
    firms.forEach((f) => bump(f.location_state));
    expertTeams.forEach((t) => bump(t.location_state));
    return counts;
  }, [professionals, firms, expertTeams]);

  // Use nearby results when location active, otherwise client-side filter
  const filtered = useMemo(() => {
    if (isLocationActive && nearbyResults) {
      let result = [...nearbyResults];
      if (!intentCountry && effectiveCountry) result = result.filter(p => isEligibleForCountry(p, effectiveCountry));
      if (verifiedOnly) result = result.filter(p => p.verified);
      if (languageFilter !== "all") result = result.filter(p => (p.languages ?? []).includes(languageFilter));
      if (acceptingOnly) result = result.filter(p =>
        p.availability_status === 'open' || !p.availability_status
      );
      if (videoOnly) result = result.filter(p => !!p.intro_video_url);
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
      // Country eligibility: the main directory already filtered server-side
      // (intentCountry prop set); on route-scoped ISR pages apply the same
      // rule client-side from the deep-link/cookie country.
      if (!intentCountry && effectiveCountry && !isEligibleForCountry(p, effectiveCountry)) return false;
      if (typeFilters.size > 0 && !typeFilters.has(p.type as ProfessionalType)) return false;
      if (stateFilter !== "all" && p.location_state !== stateFilter) return false;
      if (verifiedOnly && !p.verified) return false;
      if (feeFilter !== "all" && p.fee_structure !== feeFilter) return false;
      if (firmFilter !== "all" && p.firm_name !== firmFilter) return false;
      if (minRating > 0 && (p.rating || 0) < minRating) return false;
      if (specialtyFilters.length > 0 && !specialtyFilters.every(sf => p.specialties.includes(sf))) return false;
      if (internationalOnly && !p.accepts_international_clients && !p.firb_specialist && !p.international_tax_specialist) return false;
      if (languageFilter !== "all" && !(p.languages ?? []).includes(languageFilter)) return false;
      if (acceptingOnly && !(
        p.availability_status === 'open' || !p.availability_status
      )) return false;
      if (videoOnly && !p.intro_video_url) return false;
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
  }, [professionals, nearbyResults, isLocationActive, typeFilters, stateFilter, specialtyFilters, feeFilter, firmFilter, minRating, verifiedOnly, internationalOnly, languageFilter, acceptingOnly, videoOnly, search, sortBy, intentCountry, effectiveCountry]);

  const filteredFirms = useMemo(() => {
    return firms.filter(f => {
      if (stateFilter !== "all" && f.location_state !== stateFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return f.name.toLowerCase().includes(q)
          || f.location_display?.toLowerCase().includes(q)
          || f.location_suburb?.toLowerCase().includes(q)
          || (f.bio?.toLowerCase().includes(q) ?? false);
      }
      return true;
    });
  }, [firms, stateFilter, search]);

  const filteredTeams = useMemo(() => {
    return expertTeams.filter(t => {
      if (stateFilter !== "all" && t.location_state !== stateFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return t.name.toLowerCase().includes(q)
          || (t.description?.toLowerCase().includes(q) ?? false)
          || t.team_category.toLowerCase().includes(q)
          || t.team_type.toLowerCase().includes(q);
      }
      return true;
    });
  }, [expertTeams, stateFilter, search]);

  type FeedItem =
    | { kind: "individual"; key: string; pro: Professional }
    | { kind: "firm"; key: string; firm: AdvisorFirm; memberCount: number }
    | { kind: "team"; key: string; team: ExpertTeamCard };

  const feed: FeedItem[] = useMemo(() => {
    const individuals: FeedItem[] = filtered.map(p => ({ kind: "individual", key: `i-${p.id}`, pro: p }));
    const firmItems: FeedItem[] = filteredFirms.map(f => ({
      kind: "firm",
      key: `f-${f.id}`,
      firm: f,
      memberCount: firmMemberCounts[f.id] || 0,
    }));
    const teamItems: FeedItem[] = filteredTeams.map(t => ({ kind: "team", key: `t-${t.id}`, team: t }));
    switch (providerType) {
      case "individual": return individuals;
      case "firm": return firmItems;
      case "team": return teamItems;
      case "all":
      default:
        // Featured-first individuals are already at the top of `filtered`.
        // Firms and teams interleave behind featured individuals but ahead
        // of the long tail, so a directory landing visitor sees the
        // marquee mix without having to switch tabs.
        return [...individuals, ...firmItems, ...teamItems];
    }
  }, [filtered, filteredFirms, filteredTeams, firmMemberCounts, providerType]);

  const totalPages = Math.ceil(feed.length / RESULTS_PER_PAGE);
  const paginatedFeed = feed.slice((page - 1) * RESULTS_PER_PAGE, page * RESULTS_PER_PAGE);

  const providerTypeCounts: Record<ProviderType, number> = {
    all: filtered.length + filteredFirms.length + filteredTeams.length,
    individual: filtered.length,
    firm: filteredFirms.length,
    team: filteredTeams.length,
  };

  const advisorHeroStats = ([
    { v: String(providerTypeCounts.individual), l: "Advisors" },
    firms.length > 0 ? { v: String(providerTypeCounts.firm), l: "Firms" } : null,
    expertTeams.length > 0 ? { v: String(providerTypeCounts.team), l: "Expert teams" } : null,
    { v: "3", l: "Free intros" },
  ].filter(Boolean) as { v: string; l: string }[]).slice(0, 4);

  const activeFilterCount = [
    providerType !== "all",
    typeFilters.size > 0,
    stateFilter !== "all",
    specialtyFilters.length > 0,
    feeFilter !== "all",
    firmFilter !== "all",
    minRating > 0,
    verifiedOnly,
    internationalOnly,
    languageFilter !== "all",
    acceptingOnly,
    videoOnly,
    isLocationActive,
  ].filter(Boolean).length;

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
    setProviderType("all");
    setTypeFilters(new Set()); setStateFilter("all"); setSpecialtyFilters([]); setFeeFilter("all");
    setFirmFilter("all"); setMinRating(0);
    setVerifiedOnly(false); setInternationalOnly(false); setSearch(""); setSortBy("rating");
    setLanguageFilter("all"); setAcceptingOnly(false); setVideoOnly(false);
    setLocationSearch(null); setUserLat(null); setUserLng(null); setRadius(25);
  };

  const allLanguages = useMemo(() => {
    const present = new Set<string>();
    for (const p of professionals) {
      for (const l of p.languages ?? []) if (l) present.add(l);
    }
    if (present.size === 0) return [...AU_LANGUAGES];
    const ordered = AU_LANGUAGES.filter(l => present.has(l));
    const extra = Array.from(present).filter(l => !(AU_LANGUAGES as readonly string[]).includes(l)).sort();
    return [...ordered, ...extra];
  }, [professionals]);

  // Natural-language → filters for the standalone AI bar (below). /advisors
  // derives results from local state, so the parsed params are applied to the
  // local filter setters directly (the URL-mirror effect then reflects them) —
  // writing the URL instead wouldn't take effect here.
  const applySmartFilters = useCallback((updates: Record<string, string>) => {
    if (
      updates.provider_type === "individual" ||
      updates.provider_type === "firm" ||
      updates.provider_type === "team"
    ) {
      setProviderType(updates.provider_type);
    }
    if (updates.type) {
      const types = updates.type
        .split(",")
        .filter((v) => TYPE_FILTERS.some((f) => f.key === v)) as ProfessionalType[];
      if (types.length > 0) setTypeFilters(new Set(types));
    }
    if (updates.state && (AU_STATES as readonly string[]).includes(updates.state)) {
      setStateFilter(updates.state);
    }
    if (updates.specialty) setSpecialtyFilters(updates.specialty.split(",").filter(Boolean));
    if (updates.language) setLanguageFilter(updates.language);
    if (updates.fee) setFeeFilter(updates.fee);
    if (updates.min_rating) {
      const r = Number(updates.min_rating);
      if (!Number.isNaN(r)) setMinRating(r);
    }
    if (updates.verified === "true") setVerifiedOnly(true);
    if (updates.sort) setSortBy(updates.sort as SortKey);
  }, []);

  return (
    <>
      {/* Compact light directory header (matches the /invest treatment):
          title + breadcrumb stay filter-reactive, the stats ride as small
          inline pills, banners render in the canonical slot below. The old
          standalone "Get matched in 60s" card is folded into the toolbar. */}
      <DirectoryHero
        tone="light"
        containerClassName="container-custom"
        breadcrumbLabel={activeTypeLabel || "Find an Advisor"}
        headlineLead={dynamicTitle}
        subtitle={dynamicDescription}
        stats={advisorHeroStats}
      >
        {banners}
      </DirectoryHero>
      <div className="py-4 md:py-6">
        <div className="container-custom">

        {/* Compare/shortlist bar — canonical primitive (slate/amber). Replaces
            the bespoke violet bar that broke the design system. */}
        <CompareBar
          count={shortlistCount}
          max={shortlistMax}
          noun="advisor"
          compareHref="/advisors/compare"
          viewHref="/shortlist/advisors"
        />

        {/* Provider-type segmentation — canonical TabBar primitive.
            Hidden when sub-pages call AdvisorsClient with no firms/teams
            (e.g. /advisors/financial-planners). */}
        {(firms.length > 0 || expertTeams.length > 0) && (
          <TabBar
            variant="segmented"
            ariaLabel="Provider type"
            className="mb-3 md:mb-4"
            value={providerType}
            onChange={(id) => setProviderType(id)}
            zeroCountBehavior="disable"
            alwaysShow="all"
            tabs={[
              { id: "all", label: "All", count: providerTypeCounts.all },
              { id: "individual", label: PROVIDER_TYPE_LABELS.individual, count: providerTypeCounts.individual },
              { id: "firm", label: PROVIDER_TYPE_LABELS.firm, count: providerTypeCounts.firm },
              { id: "team", label: PROVIDER_TYPE_LABELS.team, count: providerTypeCounts.team },
            ]}
          />
        )}

        {/* Toolbar: search · Get Matched · all-filters · sort (mirrors /invest) */}
        <div className="flex flex-wrap gap-2 mb-3 items-center">
          <SearchInput
            className="flex-1"
            value={search}
            onChange={setSearch}
            placeholder="Search name, firm, team, specialty, suburb…"
            ariaLabel="Search advisors"
            id="advisor-search"
          />
          <GetMatchedEmbed context="advisor_directory" inline />
          <Link
            href="/briefs/new"
            onClick={() =>
              trackEvent("get_quotes_cta_clicked", { source: "advisors_toolbar" })
            }
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 md:px-4 py-2 text-sm font-semibold text-slate-700 whitespace-nowrap transition-colors hover:border-slate-400 hover:text-slate-900"
          >
            <Icon name="file-text" size={14} />
            Get quotes
          </Link>
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className={`inline-flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-lg border text-sm font-bold whitespace-nowrap transition-colors shrink-0 ${activeFilterCount > 0 ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-800 border-slate-300 hover:border-slate-400"}`}
          >
            <Icon name="sliders" size={14} />
            {activeFilterCount > 0 ? `Filters (${activeFilterCount})` : "All filters"}
          </button>
          <SortDropdown
            options={SORT_OPTIONS.map((o) => ({ value: o.key, label: o.label }))}
            value={sortBy}
            onChange={(v) => setSortBy(v as SortKey)}
          />
        </div>

        {/* AI filter bar — natural language → filters (standalone, mirrors /invest) */}
        <div className="mb-3">
          <SmartFilterBar setParams={applySmartFilters} surface="advisors" />
        </div>

        {/* Concierge fallback — compact secondary path. */}
        <p className="mb-3 text-xs text-slate-500">
          Prefer to chat?{" "}
          <Link
            href="/concierge?finder=advisor-finder"
            onClick={() =>
              trackEvent("concierge_seed_clicked", {
                finder: "advisor-finder",
                source: "advisors_hero",
              })
            }
            className="font-semibold text-slate-700 hover:text-coral-700 underline-offset-2 hover:underline"
          >
            Ask the AI concierge →
          </Link>
        </p>

        {/* Primary facet pills — mirrors /invest + /compare (shared FilterPill). */}
        <p className="text-sm font-semibold text-slate-700 mb-2">Narrow by type, location, and fees — or search by name.</p>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {/* Type */}
          <div className="relative">
            <FilterPill icon="users" label="Type" active={typeFilters.size > 0} open={openPill === "type"}
              value={typeFilters.size === 1 ? TYPE_FILTERS.find((f) => f.key === Array.from(typeFilters)[0])?.label : typeFilters.size > 1 ? `${typeFilters.size} types` : undefined}
              onClick={() => setOpenPill((o) => (o === "type" ? null : "type"))} />
            <FilterPopover open={openPill === "type"} onClose={() => setOpenPill(null)} label="Advisor type">
              <p className="text-xs font-bold text-slate-900 mb-2">Advisor type</p>
              <div className="flex flex-wrap gap-1.5 max-h-72 overflow-y-auto">
                {TYPE_FILTERS.filter((f) => f.key !== "all").map((f) => {
                  const count = typeCounts[f.key] ?? 0;
                  const selected = typeFilters.has(f.key as ProfessionalType);
                  return (
                    <button key={f.key} type="button" disabled={count === 0 && !selected} onClick={() => toggleType(f.key)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${selected ? "border-amber-400 bg-amber-50 text-amber-800" : "border-slate-200 text-slate-700 hover:border-slate-300"}`}>
                      <Icon name={f.icon} size={11} />
                      {f.label}
                      <span className="font-mono text-[10px] text-slate-500">{count}</span>
                    </button>
                  );
                })}
              </div>
            </FilterPopover>
          </div>
          {/* Location */}
          <div className="relative">
            <FilterPill icon="map-pin" label="Location" active={stateFilter !== "all"} open={openPill === "state"}
              value={stateFilter !== "all" ? stateFilter : undefined}
              disabled={isLocationActive}
              onClick={() => setOpenPill((o) => (o === "state" ? null : "state"))} />
            <FilterPopover open={openPill === "state"} onClose={() => setOpenPill(null)} label="Location">
              <p className="text-xs font-bold text-slate-900 mb-2">State</p>
              <div className="grid grid-cols-4 gap-1.5">
                {AU_STATES.map((s) => {
                  const count = stateCounts[s] ?? 0;
                  const selected = stateFilter === s;
                  return (
                    <button key={s} type="button" disabled={count === 0 && !selected} onClick={() => { setStateFilter(selected ? "all" : s); setOpenPill(null); }}
                      className={`py-2 rounded-lg border text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${selected ? "border-amber-400 bg-amber-50 text-amber-800" : "border-slate-200 text-slate-700 hover:border-slate-300"}`}>
                      {s}
                      <span className="block text-[9px] font-mono text-slate-500">{count}</span>
                    </button>
                  );
                })}
              </div>
            </FilterPopover>
          </div>
          {/* Fee */}
          <div className="relative">
            <FilterPill icon="wallet" label="Fee" active={feeFilter !== "all"} open={openPill === "fee"}
              value={feeFilter !== "all" ? FEE_OPTIONS.find((o) => o.value === feeFilter)?.label : undefined}
              onClick={() => setOpenPill((o) => (o === "fee" ? null : "fee"))} />
            <FilterPopover open={openPill === "fee"} onClose={() => setOpenPill(null)} label="Fee structure">
              <p className="text-xs font-bold text-slate-900 mb-2">Fee structure</p>
              <div className="grid grid-cols-2 gap-1.5">
                {FEE_OPTIONS.map((o) => (
                  <button key={o.value} type="button" onClick={() => { setFeeFilter(o.value); setOpenPill(null); }}
                    className={`px-2.5 py-2 rounded-lg border text-xs font-semibold transition-colors ${feeFilter === o.value ? "border-amber-400 bg-amber-50 text-amber-800" : "border-slate-200 text-slate-700 hover:border-slate-300"}`}>
                    {o.label}
                  </button>
                ))}
              </div>
            </FilterPopover>
          </div>
          {/* Rating */}
          <div className="relative">
            <FilterPill icon="star" label="Rating" active={minRating > 0} open={openPill === "rating"}
              value={minRating > 0 ? RATING_OPTIONS.find((o) => o.value === minRating)?.label : undefined}
              onClick={() => setOpenPill((o) => (o === "rating" ? null : "rating"))} />
            <FilterPopover open={openPill === "rating"} onClose={() => setOpenPill(null)} label="Minimum rating">
              <p className="text-xs font-bold text-slate-900 mb-2">Minimum rating</p>
              <div className="grid grid-cols-2 gap-1.5">
                {RATING_OPTIONS.map((o) => (
                  <button key={o.value} type="button" onClick={() => { setMinRating(o.value); setOpenPill(null); }}
                    className={`px-2.5 py-2 rounded-lg border text-xs font-semibold transition-colors ${minRating === o.value ? "border-amber-400 bg-amber-50 text-amber-800" : "border-slate-200 text-slate-700 hover:border-slate-300"}`}>
                    {o.label}
                  </button>
                ))}
              </div>
            </FilterPopover>
          </div>
        </div>

        {/* All-filters drawer — canonical FilterPanel; opens on every breakpoint. */}
        <FilterPanel
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          onClearAll={clearAll}
          activeCount={activeFilterCount}
          resultCount={feed.length}
          variant="drawer"
        >
          <div>
            {/* Sort — mobile-reachable (toolbar SortDropdown is desktop-only) */}
            <div className="md:hidden border-b border-slate-100 pb-3 mb-1">
              <label htmlFor="advisor-sort-m" className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 block">Sort</label>
              <select id="advisor-sort-m" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
                {SORT_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
            </div>

            <FilterGroupHeader
              label="Location"
              icon="map-pin"
              activeCount={isLocationActive ? 1 : (stateFilter !== "all" ? 1 : 0)}
              defaultOpen
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-2"><LocationSearch selected={locationSearch} onSelect={(p) => { setLocationSearch(p); if (!p) { setUserLat(null); setUserLng(null); } }} /></div>
                <select aria-label="Search radius" value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50 disabled:cursor-not-allowed" disabled={!isLocationActive}>
                  {RADIUS_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div className="mt-1.5 mb-2"><UseMyLocation onLocate={(lat, lng) => { setUserLat(lat); setUserLng(lng); setSortBy("distance"); setLocationSearch({ postcode: "", locality: "My location", state: "", latitude: lat, longitude: lng }); }} /></div>
              <div>
                <label htmlFor="adv-state" className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 block">State</label>
                <select id="adv-state" value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} disabled={isLocationActive} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50 disabled:cursor-not-allowed">
                  <option value="all">All States</option>
                  {AU_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </FilterGroupHeader>

            <FilterGroupHeader
              label="Advisor type"
              icon="users"
              activeCount={typeFilters.size}
              defaultOpen
            >
              <FacetGroup
                label=""
                layout="grid"
                counts={typeCounts}
                selected={typeFilters}
                onChange={(next) => setTypeFilters(next)}
                options={TYPE_FILTERS.filter((f) => f.key !== "all").map((f) => ({ value: f.key as ProfessionalType, label: f.label }))}
              />
            </FilterGroupHeader>

            <FilterGroupHeader
              label="Fee & cost"
              icon="credit-card"
              activeCount={feeFilter !== "all" ? 1 : 0}
              defaultOpen={false}
            >
              <label htmlFor="adv-fee" className="sr-only">Fee structure</label>
              <select id="adv-fee" value={feeFilter} onChange={(e) => setFeeFilter(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
                <option value="all">Any</option>
                <option value="fee-for-service">Fee for Service</option>
                <option value="commission">Commission</option>
                <option value="hybrid">Hybrid</option>
                <option value="percentage of AUM">% of AUM</option>
              </select>
            </FilterGroupHeader>

            <FilterGroupHeader
              label="Availability"
              icon="check-circle"
              activeCount={[verifiedOnly, internationalOnly, acceptingOnly, videoOnly].filter(Boolean).length}
              defaultOpen={false}
            >
              <FacetGroup
                label=""
                selected={new Set([verifiedOnly ? "verified" : "", internationalOnly ? "international" : "", acceptingOnly ? "accepting" : "", videoOnly ? "video" : ""].filter(Boolean))}
                onChange={(next) => { setVerifiedOnly(next.has("verified")); setInternationalOnly(next.has("international")); setAcceptingOnly(next.has("accepting")); setVideoOnly(next.has("video")); }}
                options={[{ value: "verified", label: "Verified only" }, { value: "international", label: "International clients" }, { value: "accepting", label: "Accepting new clients" }, { value: "video", label: "Has intro video" }]}
              />
            </FilterGroupHeader>

            <FilterGroupHeader
              label="Language"
              icon="globe"
              activeCount={languageFilter !== "all" ? 1 : 0}
              defaultOpen={false}
            >
              <select id="adv-lang" value={languageFilter} onChange={(e) => setLanguageFilter(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
                <option value="all">Any</option>
                {allLanguages.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </FilterGroupHeader>

            {allSpecialties.length > 0 && (
              <FilterGroupHeader
                label="Specialties"
                icon="star"
                activeCount={specialtyFilters.length}
                defaultOpen={false}
              >
                <FacetGroup
                  label=""
                  layout="grid"
                  selected={new Set(specialtyFilters)}
                  onChange={(next) => setSpecialtyFilters(Array.from(next))}
                  options={allSpecialties.map((s) => ({ value: s, label: s }))}
                />
              </FilterGroupHeader>
            )}

            <FilterGroupHeader
              label="Advisory firm"
              icon="briefcase"
              activeCount={firmFilter !== "all" ? 1 : 0}
              defaultOpen={false}
            >
              <select id="adv-firm" value={firmFilter} onChange={(e) => setFirmFilter(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
                <option value="all">All Firms</option>
                {allFirmNames.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </FilterGroupHeader>
          </div>
        </FilterPanel>

        {/* Active filter chips — canonical primitive */}
        <FilterChips
          className="mb-3"
          onClearAll={clearAll}
          chips={[
            ...(isLocationActive && locationSearch ? [{ label: `${radius > 0 ? `${radius}km from ` : "Near "}${locationSearch.locality}`, onClear: () => { setLocationSearch(null); setUserLat(null); setUserLng(null); } }] : []),
            ...Array.from(typeFilters).map((tf) => ({ label: TYPE_FILTERS.find((f) => f.key === tf)?.label ?? String(tf), onClear: () => toggleType(tf) })),
            ...(stateFilter !== "all" ? [{ label: stateFilter, onClear: () => setStateFilter("all") }] : []),
            ...specialtyFilters.map((s) => ({ label: s, onClear: () => toggleSpecialty(s) })),
            ...(feeFilter !== "all" ? [{ label: feeFilter, onClear: () => setFeeFilter("all") }] : []),
            ...(firmFilter !== "all" ? [{ label: firmFilter, onClear: () => setFirmFilter("all") }] : []),
            ...(minRating > 0 ? [{ label: `${minRating}+ stars`, onClear: () => setMinRating(0) }] : []),
            ...(verifiedOnly ? [{ label: "Verified", onClear: () => setVerifiedOnly(false) }] : []),
            ...(internationalOnly ? [{ label: "International clients", onClear: () => setInternationalOnly(false) }] : []),
            ...(languageFilter !== "all" ? [{ label: `Speaks ${languageFilter}`, onClear: () => setLanguageFilter("all") }] : []),
            ...(acceptingOnly ? [{ label: "Accepting new", onClear: () => setAcceptingOnly(false) }] : []),
            ...(videoOnly ? [{ label: "Intro video", onClear: () => setVideoOnly(false) }] : []),
          ]}
        />

        {/* Result count — canonical primitive */}
        <div className="flex items-center justify-between mb-3 md:mb-4">
          {nearbyLoading ? (
            <span className="text-sm text-slate-500">Searching nearby advisors…</span>
          ) : (
            <ResultCount
              total={feed.length}
              noun={(() => {
                const base = providerType === "firm" ? "firm" : providerType === "team" ? "expert team" : providerType === "individual" ? "advisor" : "listing";
                const noun = `${base}${feed.length !== 1 ? "s" : ""}`;
                const ctx = contextParts.length > 0 ? `${noun} ${contextParts.join(" ")}` : noun;
                return search ? `${ctx} matching “${search}”` : ctx;
              })()}
            />
          )}
          {totalPages > 1 && <p className="text-[0.62rem] md:text-xs text-slate-500">Page {page} of {totalPages}</p>}
        </div>

        {/* Firm sub-filter — narrows individual results to one firm.
            Only shown when viewing individuals, since selecting "Firms" in
            the segmented control already lists firms as result cards. */}
        {providerType === "individual" && firms.length > 0 && (
          <div className="mb-4">
            <p className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Filter by firm</p>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                onClick={() => setFirmFilter("all")}
                className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  firmFilter === "all" ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                All firms
              </button>
              {firms.map(firm => (
                <button
                  key={firm.id}
                  onClick={() => setFirmFilter(firm.name)}
                  className={`shrink-0 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                    firmFilter === firm.name ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span className={`w-4 h-4 rounded flex items-center justify-center text-[0.5rem] font-bold shrink-0 ${firmFilter === firm.name ? "bg-white/20 text-white" : "bg-amber-100 text-amber-600"}`}>
                    {firm.name.split(/\s+/).slice(0, 2).map((w: string) => w[0]).join("").toUpperCase()}
                  </span>
                  {firm.name}
                  <span className={`text-[0.6rem] ${firmFilter === firm.name ? "text-slate-300" : "text-slate-500"}`}>({firmMemberCounts[firm.id] || 0})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {nearbyLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white border border-slate-100 rounded-2xl overflow-hidden animate-pulse shadow-sm flex flex-col">
                <div className="h-44 bg-slate-100" />
                <div className="p-4 flex-1 space-y-3">
                  <div className="flex gap-1.5">
                    <div className="h-5 w-16 bg-slate-100 rounded-full" />
                    <div className="h-5 w-20 bg-slate-50 rounded-full" />
                  </div>
                  <div className="flex gap-1.5">
                    <div className="h-5 w-14 bg-slate-50 rounded-full" />
                    <div className="h-5 w-16 bg-slate-50 rounded-full" />
                    <div className="h-5 w-12 bg-slate-50 rounded-full" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="h-10 bg-slate-50 rounded-lg" />
                    <div className="h-10 bg-slate-50 rounded-lg" />
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div className="h-3 w-20 bg-slate-50 rounded-full" />
                    <div className="h-7 w-24 bg-slate-100 rounded-lg" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : paginatedFeed.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5">
            {paginatedFeed.map((item, index) => {
              if (item.kind === "firm") {
                const firm = item.firm;
                return (
                  <Link
                    key={item.key}
                    href={`/firm/${firm.slug}`}
                    className="group flex flex-col bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:border-blue-200 hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
                  >
                    {/* Logo / icon header on a blue gradient */}
                    <div className="relative h-44 bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                      <div className="absolute top-3 left-3 flex gap-1.5">
                        <span className="shrink-0 text-[0.58rem] font-bold px-2 py-0.5 rounded-full bg-white/90 text-blue-700 flex items-center gap-1 shadow-sm">
                          <Icon name="building" size={9} />
                          Firm
                        </span>
                      </div>
                      {firm.afsl_number && (
                        <span className="absolute top-3 right-3 shrink-0 text-[0.58rem] font-bold px-2 py-0.5 rounded-full bg-black/45 backdrop-blur text-white border border-white/20">
                          AFSL {firm.afsl_number}
                        </span>
                      )}
                      {firm.logo_url ? (
                        <div className="w-20 h-20 rounded-2xl overflow-hidden ring-4 ring-white/80 shadow-lg bg-white flex items-center justify-center">
                          <Image src={firm.logo_url} alt={firm.name} width={80} height={80} className="w-full h-full object-contain" />
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-2xl bg-white/15 ring-2 ring-white/40 flex items-center justify-center text-white font-bold text-2xl select-none">
                          {firm.name.split(/\s+/).slice(0, 2).map((w: string) => w[0]).join("").toUpperCase()}
                        </div>
                      )}
                    </div>
                    {/* Body */}
                    <div className="p-4 flex flex-col flex-1">
                      <span className="font-bold text-[15px] md:text-base text-slate-900 leading-tight line-clamp-2">{firm.name}</span>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap text-[0.65rem] text-slate-500">
                        <span className="flex items-center gap-0.5">
                          <Icon name="users" size={10} className="text-blue-400" />
                          {item.memberCount} advisor{item.memberCount === 1 ? "" : "s"}
                        </span>
                        {firm.location_display && (
                          <span className="flex items-center gap-0.5">
                            <Icon name="map-pin" size={10} className="text-slate-500" />
                            {firm.location_display}
                          </span>
                        )}
                      </div>
                      {firm.bio && (
                        <p className="text-[0.7rem] md:text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">{firm.bio}</p>
                      )}
                      <div className="mt-auto pt-3 flex items-center justify-between border-t border-slate-100">
                        <span className="text-[0.62rem] text-slate-500">{item.memberCount} advisor{item.memberCount === 1 ? "" : "s"}</span>
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 group-hover:text-blue-800">
                          View firm
                          <Icon name="arrow-right" size={11} />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              }

              if (item.kind === "team") {
                const team = item.team;
                return (
                  <div
                    key={item.key}
                    className="group flex flex-col bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:border-emerald-200 hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
                  >
                    {/* Icon header on an emerald gradient */}
                    <div className="relative h-44 bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
                      <span className="absolute top-3 left-3 shrink-0 text-[0.58rem] font-bold px-2 py-0.5 rounded-full bg-white/90 text-emerald-700 flex items-center gap-1 shadow-sm">
                        <Icon name="users" size={9} />
                        Expert Team
                      </span>
                      <div className="w-20 h-20 rounded-2xl bg-white/15 ring-2 ring-white/40 flex items-center justify-center text-white select-none">
                        <Icon name="users" size={34} className="text-white" />
                      </div>
                    </div>
                    {/* Body */}
                    <div className="p-4 flex flex-col flex-1">
                      <Link href={`/teams/${team.slug}`} className="font-bold text-[15px] md:text-base text-slate-900 leading-tight hover:underline line-clamp-2">
                        {team.name}
                      </Link>
                      <p className="text-[0.65rem] text-slate-500 mt-1 capitalize">
                        {team.team_category.replace(/_/g, " ")} · {team.team_type.replace(/_/g, " ")}
                        {team.location_state ? ` · ${team.location_state}` : ""}
                      </p>
                      {team.description && (
                        <p className="text-[0.7rem] md:text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">{team.description}</p>
                      )}
                      <div className="flex gap-2 mt-auto pt-3 border-t border-slate-100">
                        <Link
                          href={`/teams/${team.slug}`}
                          className="flex-1 text-center text-[0.7rem] md:text-xs font-bold text-slate-900 bg-white border border-slate-200 rounded-lg px-3 py-2 hover:border-slate-300"
                        >
                          View team
                        </Link>
                        <Link
                          href={`/briefs/new?team=${encodeURIComponent(team.slug)}`}
                          className="flex-1 text-center text-[0.7rem] md:text-xs font-bold text-white bg-coral-600 hover:bg-coral-700 rounded-lg px-3 py-2 inline-flex items-center justify-center gap-1"
                        >
                          Create brief
                          <Icon name="arrow-right" size={11} />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              }

              const pro = item.pro;
              const isFeatured = !!(pro.featured_until && new Date(pro.featured_until) > new Date());
              const initials = pro.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
              const feeText = pro.fee_description
                ? pro.fee_description
                : pro.flat_fee_cents
                  ? `${formatCents(pro.flat_fee_cents)} flat`
                  : pro.hourly_rate_cents
                    ? `${formatCents(pro.hourly_rate_cents)}/hr`
                    : pro.aum_percentage
                      ? `${pro.aum_percentage}% AUM`
                      : "On enquiry";
              const availability = pro.availability_status ?? "open";
              return (
                <Link key={item.key} href={`/advisor/${pro.slug}`} className={`group flex flex-col bg-white rounded-2xl transition-all duration-200 overflow-hidden ${
                  isFeatured
                    ? "shadow-md shadow-coral-50 hover:shadow-xl hover:shadow-coral-100/50 hover:-translate-y-0.5 ring-1 ring-coral-200/80 border border-coral-200"
                    : "shadow-sm border border-slate-100 hover:shadow-lg hover:shadow-slate-100 hover:-translate-y-0.5 hover:border-slate-200"
                }`}>
                  {/* Photo-led header */}
                  <div className="relative h-44 bg-ink-900 overflow-hidden">
                    <AdvisorPhoto
                      src={pro.photo_url}
                      alt={pro.name}
                      initials={initials}
                      priority={index < 4}
                    />
                    {/* legibility scrim */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/70" />

                    {/* top-left status pills */}
                    <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 max-w-[60%]">
                      {isFeatured && (
                        <span
                          title={SPONSORED_DISCLOSURE_SHORT}
                          className="shrink-0 text-[0.58rem] font-bold px-2 py-0.5 rounded-full bg-coral-600 text-white flex items-center gap-1 shadow-sm cursor-help"
                        >
                          <Icon name="star" size={9} />
                          Featured · Paid
                        </span>
                      )}
                      {pro.avg_response_minutes != null && pro.avg_response_minutes <= 120 && (
                        <span className="shrink-0 text-[0.58rem] font-bold px-2 py-0.5 rounded-full bg-black/45 backdrop-blur text-white border border-white/20 flex items-center gap-1">
                          <Icon name="zap" size={9} className="text-emerald-300" />
                          Fast reply
                        </span>
                      )}
                      {pro.rating > 0 && pro.review_count > 0 && (
                        <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[0.62rem] font-bold text-ink-900 shadow-sm backdrop-blur">
                          <Icon name="star" size={9} className="text-amber-500" />
                          {pro.rating}
                          <span className="font-semibold text-slate-500">({pro.review_count})</span>
                        </span>
                      )}
                    </div>

                    {/* top-right actions: save + compare (distinct glyphs) */}
                    <div className="absolute top-3 right-3 flex items-center gap-1">
                      <BookmarkButton
                        type="advisor"
                        ref={pro.slug}
                        label={pro.name}
                        iconOnly
                        className="shrink-0 p-1.5 rounded-lg bg-black/45 backdrop-blur text-white/90 hover:text-white hover:bg-black/60 transition-colors"
                      />
                      <button
                        onClick={(e) => { e.preventDefault(); toggleShortlist(pro.slug); }}
                        disabled={!inShortlist(pro.slug) && shortlistCount >= shortlistMax}
                        title={inShortlist(pro.slug) ? "Remove from compare" : shortlistCount >= shortlistMax ? "Compare list full" : "Add to compare"}
                        aria-label={inShortlist(pro.slug) ? "Remove from compare" : "Add to compare"}
                        className={`shrink-0 p-1.5 rounded-lg backdrop-blur transition-colors ${inShortlist(pro.slug) ? "text-slate-900 bg-amber-500 hover:bg-amber-400" : shortlistCount >= shortlistMax ? "text-white/40 bg-black/30 cursor-not-allowed" : "text-white/90 bg-black/45 hover:text-white hover:bg-black/60"}`}
                      >
                        <Icon name="scale" size={15} />
                      </button>
                    </div>

                    {/* bottom identity overlay */}
                    <div className="absolute bottom-2.5 left-3 right-3 text-white">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-base leading-tight truncate drop-shadow">{pro.name}</span>
                        {pro.verified && (
                          <span className="shrink-0 w-4 h-4 bg-emerald-500 rounded-full border border-white/80 flex items-center justify-center shadow-sm" title="Verified">
                            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </span>
                        )}
                      </div>
                      <div className="text-[0.68rem] text-white/85 mt-0.5 flex items-center gap-1 truncate">
                        <span className="font-semibold">{PROFESSIONAL_TYPE_LABELS[pro.type]}</span>
                        {pro.location_display && (
                          <>
                            <span className="opacity-60">·</span>
                            <Icon name="map-pin" size={10} className="text-white/70 shrink-0" />
                            <span className="truncate">{pro.location_display}</span>
                          </>
                        )}
                        {pro.distance_km !== undefined && pro.distance_km !== null && (
                          <span className="shrink-0 opacity-80">· {pro.distance_km < 1 ? "<1 km" : `${pro.distance_km} km`}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-3.5 md:p-4 flex flex-col flex-1">
                    {/* Badge row */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <VerifiedBadge
                        method={pro.verification_method ?? null}
                        abn={pro.abn ?? null}
                        afsl={pro.afsl_number ?? null}
                        compact
                      />
                      {/* PR queue #12.5 — eligibility badge per visitor's intent country */}
                      <EligibilityBadge entity={pro} intentCountry={effectiveCountry} compact />
                      {pro.accepts_international_clients && (
                        <span className="shrink-0 inline-flex items-center gap-0.5 text-[0.58rem] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                          <Icon name="globe" size={9} className="shrink-0" />Intl
                        </span>
                      )}
                      {pro.firb_specialist && (
                        <span className="shrink-0 text-[0.58rem] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">FIRB</span>
                      )}
                      {pro.account_type === "firm_member" && pro.firm_name ? (
                        <span className="shrink-0 text-[0.58rem] font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 max-w-[10rem]">
                          <Icon name="building" size={9} className="text-blue-400 shrink-0" />
                          <span className="truncate">{pro.firm_name}</span>
                        </span>
                      ) : !pro.firm_name ? (
                        <span className="shrink-0 text-[0.58rem] font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded-full">Independent</span>
                      ) : (
                        <span className="shrink-0 text-[0.58rem] font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 max-w-[10rem]">
                          <Icon name="building" size={9} className="text-slate-500 shrink-0" />
                          <span className="truncate">{pro.firm_name}</span>
                        </span>
                      )}
                    </div>

                    {/* Specialties */}
                    {pro.specialties.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2.5">
                        {pro.specialties.slice(0, 3).map(s => (
                          <span key={s} className={`text-[0.6rem] font-medium px-2 py-0.5 rounded-full border ${
                            specialtyFilters.includes(s)
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-50 text-slate-500 border-slate-200"
                          }`}>{s}</span>
                        ))}
                        {pro.specialties.length > 3 && (
                          <span className="text-[0.6rem] text-slate-500 self-center">+{pro.specialties.length - 3}</span>
                        )}
                      </div>
                    )}

                    {/* Fees gets the full width (up to 2 lines, no mid-word clip);
                        availability is a compact status pill alongside it. */}
                    <div className="mt-3 flex items-start justify-between gap-2 rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-2">
                      <div className="min-w-0">
                        <div className="iv2-mini text-[0.55rem] text-slate-500">Fees</div>
                        <div className="text-[0.72rem] font-bold leading-snug text-slate-800 line-clamp-2" title={feeText}>{feeText}</div>
                      </div>
                      <span className={`mt-0.5 shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.58rem] font-bold ${
                        availability === "open" ? "bg-emerald-100 text-emerald-700" : availability === "waitlist" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          availability === "open" ? "bg-emerald-500" : availability === "waitlist" ? "bg-amber-500" : "bg-red-500"
                        }`} />
                        {availability === "open" ? "Accepting" : availability === "waitlist" ? "Waitlist" : "Closed"}
                      </span>
                    </div>

                    {/* Offer */}
                    {pro.offer_active && pro.offer_text && (
                      <div className="mt-2.5 bg-gradient-to-r from-coral-50 to-coral-50/0 border border-coral-200 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
                        <Icon name="tag" size={11} className="text-coral-600 shrink-0" />
                        <span className="text-[0.6rem] md:text-[0.65rem] font-bold text-coral-700 truncate">{pro.offer_text}</span>
                      </div>
                    )}

                    {/* Footer: AFSL + View profile CTA */}
                    <div className="mt-auto pt-3 flex items-center justify-between gap-2 border-t border-slate-100">
                      <span className="text-[0.6rem] text-slate-500 truncate">
                        {pro.afsl_number ? `AFSL ${pro.afsl_number}` : " "}
                      </span>
                      <span className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-coral-600 px-3 py-1.5 text-[0.7rem] font-bold text-white whitespace-nowrap shadow-sm transition-colors group-hover:bg-coral-700">
                        View profile
                        <Icon name="arrow-right" size={11} />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No advisors found"
            body={isLocationActive ? `No advisors within ${radius}km — try a larger radius or clear filters.` : search ? `No results for "${search}". Try a different search or clear filters.` : "Try adjusting or clearing your filters."}
            suggestions={[
              ...(Array.from(typeFilters).map(t => ({
                label: `Type: ${TYPE_FILTERS.find(f => f.key === t)?.label ?? t} ×`,
                onClick: () => setTypeFilters(prev => { const next = new Set(prev); next.delete(t as ProfessionalType); return next; }),
              }))),
              ...(stateFilter !== "all" ? [{ label: `State: ${stateFilter} ×`, onClick: () => setStateFilter("all") }] : []),
              ...(feeFilter !== "all" ? [{ label: `Fee: ${FEE_OPTIONS.find(f => f.value === feeFilter)?.label ?? feeFilter} ×`, onClick: () => setFeeFilter("all") }] : []),
              ...(minRating > 0 ? [{ label: `Rating: ${minRating}+ ★ ×`, onClick: () => setMinRating(0) }] : []),
              ...(verifiedOnly ? [{ label: "Verified only ×", onClick: () => setVerifiedOnly(false) }] : []),
              ...(acceptingOnly ? [{ label: "Accepting clients ×", onClick: () => setAcceptingOnly(false) }] : []),
              ...(search ? [{ label: `"${search}" ×`, onClick: () => setSearch("") }] : []),
              ...(activeFilterCount > 1 ? [{ label: "Clear all", onClick: clearAll }] : []),
            ]}
          />
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
                    <span className="shrink-0 w-5 h-5 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-600 group-open:bg-amber-50 group-open:border-amber-200 group-open:text-amber-600 transition-all">
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
                type="email" autoCapitalize="off" autoCorrect="off" spellCheck={false}
                autoComplete="email"
                value={alertEmail}
                onChange={(e) => { setAlertEmail(e.target.value); setAlertError(""); }}
                placeholder="your@email.com"
                className="flex-1 px-3 py-2 border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                onKeyDown={(e) => e.key === "Enter" && saveAlert()}
              />
              <button
                onClick={saveAlert}
                disabled={alertStatus === "submitting"}
                className="px-4 py-2 bg-amber-500 text-slate-900 text-sm font-semibold rounded-lg hover:bg-amber-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                {alertStatus === "submitting" ? "Saving..." : "Set Alert"}
              </button>
            </div>
          )}
          {alertError && <p role="alert" className="text-xs text-red-600 mt-1">{alertError}</p>}
        </div>

        <div className="mt-6 md:mt-10 relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-5 md:p-8 text-center shadow-xl shadow-slate-900/10">
          <div className="absolute inset-0 opacity-5" style={{backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '32px 32px'}} />
          <div className="relative">
            <p className="text-[0.65rem] font-bold uppercase tracking-widest text-amber-400 mb-2">For Professionals</p>
            <h3 className="text-base md:text-xl font-extrabold text-white mb-1.5 md:mb-2">Are you a financial professional?</h3>
            <p className="text-xs md:text-sm text-slate-500 mb-4 md:mb-5">List your practice for free. Only pay when you receive an enquiry.</p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link href="/advisor-apply" className="inline-flex items-center gap-2 px-5 py-2.5 md:px-6 md:py-3 bg-amber-500 text-slate-900 text-sm font-bold rounded-xl hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/25">
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

        <div className="mt-4 md:mt-6 text-[0.58rem] md:text-xs text-slate-500 text-center leading-relaxed">
          <p>All advisors listed are verified against the ASIC Financial Advisers Register or Tax Practitioners Board. Invest.com.au does not provide financial advice. Selecting an advisor is your decision &mdash; we facilitate the connection only.</p>
        </div>
      </div>
    </div>
    </>
  );
}
