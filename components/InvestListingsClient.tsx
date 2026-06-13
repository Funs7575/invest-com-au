"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { InvestmentListing, ListingKind } from "@/lib/types";
import { categoryForListing, listingUrl } from "@/lib/listing-url";
import { categoryListingsHref } from "@/lib/invest-listing-routes";
import {
  TICKET_BUCKETS,
  ticketBucketByKey,
  INVESTOR_TYPES,
  type InvestorType,
  deriveListingKind,
  listingKindMeta,
  filterSpecForKind,
  formatAudCompact,
  formatListingPrice,
  freshnessSignal,
} from "@/lib/listing-kind";
import InvestListingCard from "@/components/InvestListingCard";
import GetMatchedEmbed from "@/components/get-matched/GetMatchedEmbed";
import ListingCompareBar from "@/components/invest/ListingCompareBar";
import SaveSearchButton from "@/components/invest/SaveSearchButton";
import Icon from "@/components/Icon";
import MarketplaceFilterBar from "@/components/invest/MarketplaceFilterBar";
import SearchInput from "@/components/directory/SearchInput";
import SortDropdown from "@/components/directory/SortDropdown";
import FilterPanel from "@/components/directory/FilterPanel";
import FacetGroup from "@/components/directory/FacetGroup";
import {
  canonicalEnumValue,
  filterableMetrics,
  metricNumberByDef,
  normaliseEnumToken,
  type VerticalMetricDef,
} from "@/lib/listings/vertical-metrics";
import RangeSlider from "@/components/directory/RangeSlider";
import DualRangeSlider from "@/components/directory/DualRangeSlider";
import SubCategoryChips from "@/components/directory/SubCategoryChips";
import SmartFilterBar from "@/components/directory/SmartFilterBar";
import MapPanel from "@/components/directory/MapPanel";
import { getSubCategoryChips } from "@/lib/sub-categories";

// ─── Props ───────────────────────────────────────────────────────────
export interface InvestListingsClientProps {
  listings: InvestmentListing[];
  categories: { slug: string; label: string }[];
  initialCategory?: string;
  initialSubcategory?: string;
  /** Vertical-listings pages pass this to lock the category and hide
   *  the global category tab bar. */
  lockedCategory?: string;
  pageTitle?: string;
  pageSubtitle?: string;
  /** Optional: visitor's intent country (set on FIRB / foreign-investment
   *  funnels). When set, the FIRB badge on cards becomes meaningful and
   *  the "FIRB eligible only" toggle is auto-surfaced in filters. */
  intentCountry?: string | null;
  /** Pre-computed smart-match scores per listing id (Wave 3). Cards render
   *  a green "X% match" pill when present. */
  matchScores?: Record<number, number>;
  matchReasons?: Record<number, string[]>;
  /** Pre-computed advisor opt-in counts per listing id (Wave 3). Cards
   *  render an emerald "X advisors can assess this" pill when > 0. */
  advisorOptInCounts?: Record<number, number>;
  /** Set of slugs that already have an approved claim. Cards NOT in this
   *  set render a small "Are you the owner?" link. (Wave 3) */
  claimedSlugs?: Set<string>;
  /** Show the compact "Build an action plan" Get Matched CTA inline on the
   *  search row. Set only on the cross-sector marketplace (/invest) — sector
   *  /listings pages keep their leaner toolbar. */
  showActionPlanCta?: boolean;
  /** Hide the in-results "Filter results by type" chips. Set on pages that
   *  render a SubCategoryNav tab bar above this component — two sub-type
   *  selectors side by side read as a duplicate (the chips filter in place,
   *  the tabs navigate to /invest/<cat>/listings/<sub>; users can't tell). */
  hideSubCategoryChips?: boolean;
  /** Set when the page's server query already scopes listings exactly
   *  (e.g. vertical + sub_category on /invest/<cat>/listings/<sub>). The
   *  category lock then only drives chrome (hides the sector pill) and must
   *  NOT re-filter: categoryForListing maps fund-family sub-types and
   *  listed_security kinds to a different slug than the page's, which would
   *  silently drop server-scoped listings. */
  skipCategoryFilter?: boolean;
}

// ─── Australian states ───────────────────────────────────────────────
const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"] as const;

// ─── Sort options ────────────────────────────────────────────────────
type SortKey = "newest" | "price-asc" | "price-desc" | "popular" | "closing-soon";
const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "popular", label: "Most viewed" },
  { value: "closing-soon", label: "Closing soon" },
];

// ─── View modes ──────────────────────────────────────────────────────
type ViewMode = "grid" | "list" | "table" | "map";
const VIEW_MODES: { value: ViewMode; label: string; icon: string }[] = [
  { value: "grid", label: "Grid", icon: "grid" },
  { value: "list", label: "List", icon: "list" },
  { value: "table", label: "Table", icon: "table" },
  { value: "map", label: "Map", icon: "map-pin" },
];

// Notice shown on non-location verticals when in map view
const MAP_NOTICE_VERTICALS: Record<string, string> = {
  startup: "startup & fund",
  fund: "startup & fund",
  alternatives: "alternatives",
  royalty: "royalties",
  listed_security: "listed securities",
  private_credit: "private credit",
};

function resolveTicketBucketKey(raw: string | null): string {
  if (!raw) return "";
  // Legacy numeric index form (?price=3) → translate to new key
  const asNum = Number(raw);
  if (!Number.isNaN(asNum) && asNum >= 0 && asNum < TICKET_BUCKETS.length) {
    return TICKET_BUCKETS[asNum].key;
  }
  // New key form (?price=100k-1m)
  return TICKET_BUCKETS.some((b) => b.key === raw) ? raw : "";
}

function prettyCategory(slug: string, categories: { slug: string; label: string }[]): string {
  const match = categories.find((c) => c.slug === slug);
  if (match) return match.label;
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function InvestListingsClient({
  listings,
  categories,
  initialCategory,
  initialSubcategory,
  lockedCategory,
  pageTitle,
  pageSubtitle,
  intentCountry,
  matchScores,
  matchReasons,
  advisorOptInCounts,
  claimedSlugs,
  showActionPlanCta,
  hideSubCategoryChips,
  skipCategoryFilter,
}: InvestListingsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ── State from URL (single source of truth — keeps Back/Forward + sharing working) ──
  const activeCategory = lockedCategory
    ? lockedCategory
    : (searchParams.get("category") ?? initialCategory ?? "all");
  const activeSubcategory = searchParams.get("sub") ?? initialSubcategory ?? "";
  const activeState = searchParams.get("state") ?? "";
  const activeTicket = resolveTicketBucketKey(searchParams.get("price"));
  const activeSort = (searchParams.get("sort") ?? "newest") as SortKey;
  const activeView = (searchParams.get("view") ?? "grid") as ViewMode;

  // Kind filter — `?kind=fund` narrows to one listing kind. Multi-kind
  // selection encoded as comma-separated values.
  const activeKindsRaw = searchParams.get("kind") ?? "";
  const activeKinds = useMemo(
    () => new Set(activeKindsRaw.split(",").filter(Boolean) as ListingKind[]),
    [activeKindsRaw],
  );

  // Universal advanced filters
  const activeInvestorType = (searchParams.get("investor") ?? "") as InvestorType;
  const activeFirbOnly = searchParams.get("firb") === "eligible";

  // Registry-driven category facets (idea #1): one URL param per metric,
  // `m_<key>` — ranges as "lo-hi", enums as CSV, toggles as "1".
  const categoryMetricDefs = useMemo(
    () => filterableMetrics(activeCategory).filter((d) => d.key !== "yield_percent"),
    [activeCategory],
  );
  const activeMetricFilters = useMemo(() => {
    const out: Array<{ def: VerticalMetricDef; raw: string }> = [];
    for (const def of categoryMetricDefs) {
      const raw = searchParams.get(`m_${def.key}`);
      if (raw) out.push({ def, raw });
    }
    return out;
  }, [categoryMetricDefs, searchParams]);
  const metricValues = useMemo(() => {
    const out: Record<string, string> = {};
    for (const def of categoryMetricDefs) {
      out[def.key] = searchParams.get(`m_${def.key}`) ?? "";
    }
    return out;
  }, [categoryMetricDefs, searchParams]);
  const metricBounds = useMemo(() => {
    const bounds: Record<string, { min: number; max: number }> = {};
    if (categoryMetricDefs.length === 0) return bounds;
    const rows = listings.filter((l) => categoryForListing(l) === activeCategory);
    for (const def of categoryMetricDefs) {
      if (def.filter !== "range") continue;
      // Def-aware parse — legacy rows store display strings ("$680,000"),
      // and a raw Number() would NaN them out of the facet's bounds.
      const vals = rows
        .map((l) => metricNumberByDef(def, ((l.key_metrics ?? {}) as Record<string, unknown>)[def.key]))
        .filter((n): n is number => n != null);
      if (vals.length >= 2) {
        bounds[def.key] = { min: Math.floor(Math.min(...vals)), max: Math.ceil(Math.max(...vals)) };
      }
    }
    return bounds;
  }, [categoryMetricDefs, listings, activeCategory]);
  const activeSivOnly = searchParams.get("siv") === "complying";
  const activeWholesaleOnly = searchParams.get("wholesale") === "true";
  const activeFreshness = searchParams.get("fresh") ?? ""; // 'new_this_week' | 'closing_soon'
  const activeFeaturedOnly = searchParams.get("featured") === "true";
  const activeMinYield = searchParams.get("min_yield") ?? ""; // numeric % string
  const activeMaxYield = searchParams.get("max_yield") ?? ""; // numeric % string
  const activeStages = useMemo(
    () => new Set((searchParams.get("stage") ?? "").split(",").filter(Boolean)),
    [searchParams],
  );
  const activeAsxSector = searchParams.get("sector") ?? "";
  const activeAsxMcap = searchParams.get("mcap") ?? "";
  const activeDivYieldMin = searchParams.get("div_yield_min") ?? "";
  const activeEsicOnly = searchParams.get("esic") === "true";

  // Free-text search (URL-backed so back-button works + share-able)
  const initialQuery = searchParams.get("q") ?? "";
  const [searchInput, setSearchInput] = useState(initialQuery);
  useEffect(() => { setSearchInput(initialQuery); }, [initialQuery]);
  const activeQuery = initialQuery.toLowerCase();

  // Filter drawer open state — kept local, never persisted
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Map hover/select state — local only, syncs list↔map without URL noise
  const [mapHoveredId, setMapHoveredId] = useState<number | null>(null);
  const [mapSelectedId, setMapSelectedId] = useState<number | null>(null);

  // ── URL update helper ──
  const setParams = useCallback(
    (updates: Record<string, string>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v) next.set(k, v);
        else next.delete(k);
      }
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const clearAllFilters = useCallback(() => {
    const next = new URLSearchParams(searchParams.toString());
    for (const key of [
      "category", "sub", "state", "price", "sort", "q", "firb", "siv",
      "wholesale", "investor", "kind", "fresh", "featured", "min_yield", "esic",
      "max_yield", "stage", "sector", "mcap", "div_yield_min",
    ]) {
      next.delete(key);
    }
    // Registry facets are dynamic (m_<key>) — sweep them all.
    for (const key of Array.from(next.keys())) {
      if (key.startsWith("m_")) next.delete(key);
    }
    // View mode is a display preference, NOT a filter — preserve it.
    setSearchInput("");
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }, [router, pathname, searchParams]);

  const toggleKind = useCallback((k: ListingKind) => {
    const next = new Set(activeKinds);
    if (next.has(k)) next.delete(k); else next.add(k);
    setParams({ kind: Array.from(next).join(",") });
  }, [activeKinds, setParams]);

  const submitSearch = useCallback((q: string) => {
    setParams({ q: q.trim() });
  }, [setParams]);

  // Marketplace sector selection → navigate to the sector's canonical
  // `/invest/<slug>/listings` page (the single sector destination) rather
  // than filtering in place. Active filters are carried across so a user
  // who set State/Budget/etc. before picking a sector keeps them. Only
  // wired on the unlocked marketplace (locked vertical pages hide Sector).
  const selectCategory = useCallback((slug: string) => {
    const carry: Record<string, string> = {};
    searchParams.forEach((v, k) => {
      if (k !== "category" && k !== "sub" && v) carry[k] = v;
    });
    router.push(categoryListingsHref(slug, carry));
  }, [router, searchParams]);

  // ── Derived sub-categories for the active category ──
  // "New since your last visit" (idea #6): a personal lens, so it lives in
  // localStorage + local state rather than the sharable URL params. A visit
  // older than 30 minutes rolls the previous timestamp into the comparison
  // point; quick reloads keep the same baseline.
  const [lastVisit, setLastVisit] = useState<string | null>(null);
  const [showNewOnly, setShowNewOnly] = useState(false);
  useEffect(() => {
    try {
      const now = Date.now();
      const lastSeenRaw = localStorage.getItem("inv_invest_last_seen");
      const prevRaw = localStorage.getItem("inv_invest_prev_visit");
      const lastSeen = lastSeenRaw ? Number(lastSeenRaw) : null;
      if (lastSeen && now - lastSeen > 30 * 60 * 1000) {
        localStorage.setItem("inv_invest_prev_visit", String(lastSeen));
        setLastVisit(new Date(lastSeen).toISOString());
      } else if (prevRaw) {
        setLastVisit(new Date(Number(prevRaw)).toISOString());
      }
      localStorage.setItem("inv_invest_last_seen", String(now));
    } catch {
      /* storage unavailable — the lens just doesn't appear */
    }
  }, []);
  const newSinceVisitCount = useMemo(() => {
    if (!lastVisit) return 0;
    return listings.filter((l) => l.created_at > lastVisit).length;
  }, [listings, lastVisit]);

  const subCategories = useMemo(() => {
    if (activeCategory === "all") return [];
    const subs = new Set<string>();
    for (const l of listings) {
      if (categoryForListing(l) === activeCategory && l.sub_category) {
        subs.add(l.sub_category);
      }
    }
    return Array.from(subs).sort();
  }, [listings, activeCategory]);

  // ── Per-kind counts for the segmented control ──
  const kindCounts = useMemo(() => {
    const counts: Record<string, number> = { all: listings.length };
    for (const l of listings) {
      const k = deriveListingKind(l);
      counts[k] = (counts[k] ?? 0) + 1;
    }
    return counts;
  }, [listings]);

  // ── Per-category counts ──
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: listings.length };
    for (const l of listings) {
      const c = categoryForListing(l);
      if (c) counts[c] = (counts[c] ?? 0) + 1;
    }
    return counts;
  }, [listings]);

  // ── Per-state counts (for the Location pill in the filter bar) ──
  const stateCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const l of listings) {
      if (l.location_state) counts[l.location_state] = (counts[l.location_state] ?? 0) + 1;
    }
    return counts;
  }, [listings]);

  // ── The main filter + sort pipeline ──
  const filtered = useMemo(() => {
    let result = listings;

    if (activeKinds.size > 0) {
      result = result.filter((l) => activeKinds.has(deriveListingKind(l)));
    }

    if (activeCategory !== "all" && !skipCategoryFilter) {
      result = result.filter((l) => categoryForListing(l) === activeCategory);
    }

    if (activeSubcategory) {
      result = result.filter((l) => l.sub_category === activeSubcategory);
    }

    if (activeState) {
      result = result.filter((l) => l.location_state === activeState);
    }

    if (activeTicket) {
      const range = ticketBucketByKey(activeTicket);
      result = result.filter((l) => {
        const km = (l.key_metrics ?? {}) as Record<string, unknown>;
        const minInvest = km["min_investment_aud"] ?? km["min_commit_aud"] ?? km["min_investment"];
        const minInvestCents = typeof minInvest === "number" ? minInvest * 100 : undefined;
        const ticket = l.asking_price_cents ?? minInvestCents;
        if (ticket == null) return false;
        return ticket >= range.min && ticket < range.max;
      });
    }

    if (activeQuery) {
      result = result.filter((l) => {
        const km = (l.key_metrics ?? {}) as Record<string, unknown>;
        const haystack = [
          l.title, l.description, l.location_city, l.location_state,
          l.industry, l.sub_category,
          String(km["asx_ticker"] ?? ""),
          String(km["brand"] ?? ""),
          String(km["commodity"] ?? ""),
        ]
          .filter((x): x is string => typeof x === "string")
          .join(" ")
          .toLowerCase();
        return haystack.includes(activeQuery);
      });
    }

    if (activeFirbOnly) result = result.filter((l) => l.firb_eligible === true);
    if (activeSivOnly) result = result.filter((l) => l.siv_complying === true);
    if (showNewOnly && lastVisit) {
      result = result.filter((l) => l.created_at > lastVisit);
    }

    for (const { def, raw } of activeMetricFilters) {
      result = result.filter((l) => {
        const v = ((l.key_metrics ?? {}) as Record<string, unknown>)[def.key];
        if (def.filter === "range") {
          const [loS, hiS] = raw.split("-");
          const lo = Number(loS) || 0;
          const hi = hiS ? Number(hiS) || Infinity : Infinity;
          const n = metricNumberByDef(def, v);
          return n != null && n >= lo && n <= hi;
        }
        if (def.filter === "multi" || def.filter === "select") {
          // Canonicalise both sides through the registry aliases so
          // synonym rows ("producer" vs "production") stay in the facet.
          const canonical = (token: string) =>
            canonicalEnumValue(def, token) ?? normaliseEnumToken(token);
          const wanted = new Set(raw.split(",").map(canonical));
          return wanted.has(canonical(String(v ?? "")));
        }
        if (def.filter === "toggle") return v === true || v === "true";
        return true;
      });
    }

    if (activeWholesaleOnly) {
      result = result.filter((l) => {
        const km = (l.key_metrics ?? {}) as Record<string, unknown>;
        return km["wholesale_only"] === true || km["s708_required"] === true || km["accredited_only"] === true;
      });
    }

    if (activeInvestorType === "retail") {
      result = result.filter((l) => {
        const km = (l.key_metrics ?? {}) as Record<string, unknown>;
        const wholesaleOnly = km["wholesale_only"] === true || km["s708_required"] === true || km["accredited_only"] === true;
        return !wholesaleOnly || km["open_to_retail"] === true;
      });
    }
    if (activeInvestorType === "siv") {
      result = result.filter((l) => l.siv_complying === true);
    }
    if (activeInvestorType === "wholesale" || activeInvestorType === "sophisticated") {
      result = result.filter((l) => {
        const km = (l.key_metrics ?? {}) as Record<string, unknown>;
        return km["wholesale_only"] === true || km["s708_required"] === true || km["accredited_only"] === true;
      });
    }
    if (activeInvestorType === "family_office") {
      result = result.filter((l) => {
        const km = (l.key_metrics ?? {}) as Record<string, unknown>;
        const wholesaleGated = km["wholesale_only"] === true || km["s708_required"] === true || km["accredited_only"] === true;
        const highMin = typeof km["min_investment_cents"] === "number" && km["min_investment_cents"] >= 500_000_00;
        return wholesaleGated || highMin;
      });
    }

    if (activeFreshness === "new_this_week") {
      result = result.filter((l) => freshnessSignal(l) === "new_this_week");
    }
    if (activeFreshness === "closing_soon") {
      result = result.filter((l) => freshnessSignal(l) === "closing_soon");
    }

    if (activeFeaturedOnly) {
      result = result.filter((l) => l.listing_type === "featured" || l.listing_type === "premium");
    }

    if (activeMinYield || activeMaxYield) {
      const lo = Number(activeMinYield) || 0;
      const hi = Number(activeMaxYield) || Infinity;
      result = result.filter((l) => {
        const km = (l.key_metrics ?? {}) as Record<string, unknown>;
        const candidates = [
          km["distribution_yield"], km["target_yield_pct"], km["target_yield_pa"],
          km["dividend_yield"], km["yield_percent"], km["target_irr_percent"],
          km["target_irr"], km["historical_return_pa"], km["return_5yr_pa"],
          km["target_return_pa"], km["estimated_return_percent"],
        ];
        for (const c of candidates) {
          let n: number | null = null;
          if (typeof c === "number") n = c;
          else if (typeof c === "string") {
            const parsed = Number(c.replace(/[^\d.]/g, ""));
            if (!Number.isNaN(parsed)) n = parsed;
          }
          if (n !== null && n >= lo && (hi === Infinity || n <= hi)) return true;
        }
        return false;
      });
    }

    if (activeStages.size > 0) {
      result = result.filter((l) => {
        const km = (l.key_metrics ?? {}) as Record<string, unknown>;
        const stage = km["stage"];
        return typeof stage === "string" && activeStages.has(stage);
      });
    }

    if (activeAsxSector) {
      result = result.filter((l) => {
        const km = (l.key_metrics ?? {}) as Record<string, unknown>;
        return km["sector"] === activeAsxSector;
      });
    }

    if (activeAsxMcap) {
      result = result.filter((l) => {
        const km = (l.key_metrics ?? {}) as Record<string, unknown>;
        return km["market_cap_band"] === activeAsxMcap;
      });
    }

    if (activeDivYieldMin) {
      const minDiv = Number(activeDivYieldMin);
      if (!Number.isNaN(minDiv)) {
        result = result.filter((l) => {
          const km = (l.key_metrics ?? {}) as Record<string, unknown>;
          const dy = km["dividend_yield"];
          const n = typeof dy === "number" ? dy : typeof dy === "string" ? Number(dy.replace(/[^\d.]/g, "")) : NaN;
          return !Number.isNaN(n) && n >= minDiv;
        });
      }
    }

    if (activeEsicOnly) {
      result = result.filter((l) => {
        const km = (l.key_metrics ?? {}) as Record<string, unknown>;
        return km["esic_eligible"] === true;
      });
    }

    // Sort
    const sorted = [...result];
    switch (activeSort) {
      case "newest":
        sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
        break;
      case "price-asc":
        sorted.sort((a, b) => (a.asking_price_cents ?? Infinity) - (b.asking_price_cents ?? Infinity));
        break;
      case "price-desc":
        sorted.sort((a, b) => (b.asking_price_cents ?? 0) - (a.asking_price_cents ?? 0));
        break;
      case "popular":
        sorted.sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
        break;
      case "closing-soon":
        sorted.sort((a, b) => {
          const ax = a.expires_at ? new Date(a.expires_at).getTime() : Infinity;
          const bx = b.expires_at ? new Date(b.expires_at).getTime() : Infinity;
          return ax - bx;
        });
        break;
    }

    return sorted;
  }, [
    listings, activeKinds, activeCategory, activeSubcategory, activeState,
    activeTicket, activeQuery, activeFirbOnly, activeSivOnly, activeWholesaleOnly,
    activeInvestorType, activeFreshness, activeFeaturedOnly, activeMinYield,
    activeMaxYield, activeStages, activeAsxSector, activeAsxMcap, activeDivYieldMin,
    activeEsicOnly, activeSort, skipCategoryFilter, showNewOnly, lastVisit, activeMetricFilters,
  ]);

  // ── Live per-facet counts for the compliance facet (Session 5.5) ──
  // Counted over the current result set so the FacetGroup shows how many
  // of the shown listings carry each attribute and disables zero-count
  // options. Mirrors the predicates used in the filter pipeline above.
  const complianceCounts = useMemo(() => {
    const isWholesale = (l: InvestmentListing) => {
      const km = (l.key_metrics ?? {}) as Record<string, unknown>;
      return km["wholesale_only"] === true || km["s708_required"] === true || km["accredited_only"] === true;
    };
    const isEsic = (l: InvestmentListing) =>
      ((l.key_metrics ?? {}) as Record<string, unknown>)["esic_eligible"] === true;
    return {
      firb: filtered.filter((l) => l.firb_eligible === true).length,
      siv: filtered.filter((l) => l.siv_complying === true).length,
      wholesale: filtered.filter(isWholesale).length,
      esic: filtered.filter(isEsic).length,
    };
  }, [filtered]);

  // ── Typeahead suggestions for the search box (Session 5.5) ──
  // Filter-like terms (sector / sub-type / state / ASX ticker) make tighter
  // suggestions than full listing titles. Deduped, sorted, capped.
  const searchSuggestions = useMemo(() => {
    const set = new Set<string>();
    for (const l of listings) {
      if (l.industry) set.add(l.industry);
      if (l.sub_category) set.add(l.sub_category);
      if (l.location_state) set.add(l.location_state);
      const ticker = ((l.key_metrics ?? {}) as Record<string, unknown>)["asx_ticker"];
      if (typeof ticker === "string" && ticker) set.add(ticker.toUpperCase());
    }
    return Array.from(set).sort().slice(0, 60);
  }, [listings]);

  // ── Active-filter chips ──
  const activeChips: Array<{ label: string; onClear: () => void }> = [];
  if (!lockedCategory && activeCategory !== "all") {
    activeChips.push({
      label: `Category: ${prettyCategory(activeCategory, categories)}`,
      onClear: () => setParams({ category: "", sub: "" }),
    });
  }
  if (activeKinds.size > 0) {
    Array.from(activeKinds).forEach((k) => {
      const meta = listingKindMeta(k);
      activeChips.push({ label: meta.label, onClear: () => toggleKind(k) });
    });
  }
  if (activeSubcategory) {
    activeChips.push({ label: `Sub: ${activeSubcategory.replace(/_/g, " ")}`, onClear: () => setParams({ sub: "" }) });
  }
  if (activeState) {
    activeChips.push({ label: `State: ${activeState}`, onClear: () => setParams({ state: "" }) });
  }
  if (activeTicket) {
    activeChips.push({ label: `Ticket: ${ticketBucketByKey(activeTicket).label}`, onClear: () => setParams({ price: "" }) });
  }
  if (activeInvestorType) {
    activeChips.push({
      label: INVESTOR_TYPES.find((t) => t.value === activeInvestorType)?.label ?? activeInvestorType,
      onClear: () => setParams({ investor: "" }),
    });
  }
  if (activeFirbOnly) activeChips.push({ label: "FIRB-eligible", onClear: () => setParams({ firb: "" }) });
  if (activeSivOnly) activeChips.push({ label: "SIV-complying", onClear: () => setParams({ siv: "" }) });
  if (activeWholesaleOnly) activeChips.push({ label: "Wholesale only", onClear: () => setParams({ wholesale: "" }) });
  if (activeFreshness) {
    activeChips.push({
      label: activeFreshness === "new_this_week" ? "New this week" : "Closing soon",
      onClear: () => setParams({ fresh: "" }),
    });
  }
  if (activeFeaturedOnly) activeChips.push({ label: "Featured only", onClear: () => setParams({ featured: "" }) });
  for (const { def, raw } of activeMetricFilters) {
    const pretty =
      def.filter === "range"
        ? raw.replace("-", "–")
        : def.filter === "toggle"
          ? "Yes"
          : raw
              .split(",")
              .map((v) => def.enumValues?.find((e) => e.value === v)?.label ?? v)
              .join(", ");
    activeChips.push({
      label: `${def.label}: ${pretty}`,
      onClear: () => setParams({ [`m_${def.key}`]: "" }),
    });
  }
  if (activeMinYield && activeMaxYield) {
    activeChips.push({ label: `Yield ${activeMinYield}%–${activeMaxYield}%`, onClear: () => setParams({ min_yield: "", max_yield: "" }) });
  } else if (activeMinYield) {
    activeChips.push({ label: `Yield ≥ ${activeMinYield}%`, onClear: () => setParams({ min_yield: "" }) });
  } else if (activeMaxYield) {
    activeChips.push({ label: `Yield ≤ ${activeMaxYield}%`, onClear: () => setParams({ max_yield: "" }) });
  }
  if (activeStages.size > 0) {
    activeChips.push({ label: `Stage: ${Array.from(activeStages).join(", ")}`, onClear: () => setParams({ stage: "" }) });
  }
  if (activeAsxSector) activeChips.push({ label: `Sector: ${activeAsxSector}`, onClear: () => setParams({ sector: "" }) });
  if (activeAsxMcap) activeChips.push({ label: `Cap: ${activeAsxMcap}`, onClear: () => setParams({ mcap: "" }) });
  if (activeDivYieldMin) activeChips.push({ label: `Div ≥ ${activeDivYieldMin}%`, onClear: () => setParams({ div_yield_min: "" }) });
  if (activeEsicOnly) activeChips.push({ label: "ESIC-eligible", onClear: () => setParams({ esic: "" }) });
  if (activeQuery) {
    activeChips.push({
      label: `"${initialQuery}"`,
      onClear: () => { setSearchInput(""); setParams({ q: "" }); },
    });
  }

  // Count of active advanced (drawer-only) filters — drives the
  // "All filters" badge in the pill bar.
  const advancedCount = [
    activeInvestorType,
    activeFirbOnly,
    activeSivOnly,
    activeWholesaleOnly,
    activeEsicOnly,
    activeMinYield,
    activeMaxYield,
    activeFreshness,
    activeFeaturedOnly,
    activeStages.size > 0 ? "stage" : "",
    activeAsxSector,
    activeAsxMcap,
    activeDivYieldMin,
  ].filter(Boolean).length;

  // Drive kind-specific filters off the active narrowed kind.
  const narrowedKind: ListingKind | null = activeKinds.size === 1 ? Array.from(activeKinds)[0] : null;
  const kindSpec = filterSpecForKind(narrowedKind);

  const lockedCategoryLabel = lockedCategory ? prettyCategory(lockedCategory, categories) : null;

  return (
    <div>
      {/* ── Page-header band (vertical-listings pages only) ────── */}
      {pageTitle && (
        <div className="bg-white border-b border-slate-100 py-6 md:py-8">
          <div className="container-custom">
            {lockedCategory && lockedCategoryLabel && (
              <div className="flex items-center gap-2 mb-3 text-xs flex-wrap">
                <Link href="/invest" className="text-slate-500 hover:text-slate-900 font-semibold inline-flex items-center gap-1 transition-colors">
                  <span aria-hidden="true">←</span> Browse all listings
                </Link>
                <span className="text-slate-300" aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-semibold ring-1 bg-amber-50 text-amber-700 ring-amber-200">
                  <Icon name="filter" size={11} />
                  Filtered to {lockedCategoryLabel}
                </span>
              </div>
            )}
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-slate-900 leading-tight">{pageTitle}</h1>
            {pageSubtitle && (
              <p className="text-sm md:text-base text-slate-600 leading-relaxed mt-2 max-w-3xl">{pageSubtitle}</p>
            )}
          </div>
        </div>
      )}

      {/* ── Single sticky toolbar (replaces the old two-bar stack) ── */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="container-custom py-3 space-y-2.5">
          {/* Row 1: search · action-plan CTA · sort · view-mode toggle */}
          <div className="flex flex-wrap gap-2 items-center">
            <SearchInput
              id="listings-search"
              value={searchInput}
              onChange={setSearchInput}
              onSubmit={submitSearch}
              placeholder="Search title, sector, ticker, suburb…"
              ariaLabel="Search listings"
              suggestions={searchSuggestions}
            />

            {/* Compact Get Matched entry point — replaces the old standalone
                card that pushed listings below the fold. */}
            {showActionPlanCta && <GetMatchedEmbed context="opportunity" inline />}

            <SortDropdown
              options={SORT_OPTIONS}
              value={activeSort}
              onChange={(v) => setParams({ sort: v === "newest" ? "" : v })}
            />

            <div className="shrink-0 hidden sm:inline-flex rounded-lg border border-slate-200 bg-white p-0.5" role="tablist" aria-label="View mode">
              {VIEW_MODES.map((v) => (
                <button
                  key={v.value}
                  type="button"
                  role="tab"
                  aria-selected={activeView === v.value}
                  aria-label={`${v.label} view`}
                  onClick={() => setParams({ view: v.value === "grid" ? "" : v.value })}
                  className={`inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-500 transition-all ${
                    activeView === v.value ? "bg-slate-100 text-slate-900" : "hover:bg-slate-50"
                  }`}
                >
                  <Icon name={v.icon} size={14} />
                </button>
              ))}
            </div>

            <Link
              href="/invest/sold"
              className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full border border-slate-300 bg-white text-slate-700 hover:border-emerald-400 hover:text-emerald-800 px-3 py-1.5 transition-colors"
            >
              <Icon name="check-circle" size={12} />
              Recently sold
            </Link>
            {lastVisit && newSinceVisitCount > 0 && (
              <button
                type="button"
                onClick={() => setShowNewOnly((v) => !v)}
                aria-pressed={showNewOnly}
                className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-full border px-3 py-1.5 transition-colors ${
                  showNewOnly
                    ? "bg-sky-600 border-sky-600 text-white"
                    : "bg-sky-50 border-sky-200 text-sky-800 hover:border-sky-400"
                }`}
              >
                <Icon name="clock" size={12} />
                New since your last visit ({newSinceVisitCount})
              </button>
            )}

            {/* Save current filter set as a named saved-search */}
            <SaveSearchButton
              activeChipsCount={activeChips.length}
              filters={{
                // Locked category pages (e.g. /invest/farmland/listings)
                // scope via prop, not URL param — bake it into the saved
                // filters or the alert cron would match across all sectors.
                ...(lockedCategory ? { category: lockedCategory } : {}),
                ...Object.fromEntries(searchParams.entries()),
              }}
            />
          </div>

          {/* AI filter bar — natural language → URL params */}
          <SmartFilterBar
            setParams={setParams}
            surface="invest"
          />

          {/* Primary facet pill-bar + active-filter chips (compliance-safe),
              shown on ALL breakpoints — this is now the single filter
              surface; the long-tail facets open from its "All filters"
              button. Reads/writes the SAME URL params as the drawer. */}
          <div>
            <MarketplaceFilterBar
              params={new URLSearchParams(searchParams.toString())}
              setParams={setParams}
              onOpenAllFilters={() => setDrawerOpen(true)}
              advancedCount={advancedCount}
              resultCount={filtered.length}
              categories={categories}
              categoryCounts={categoryCounts}
              kindCounts={kindCounts}
              stateCounts={stateCounts}
              activeChips={activeChips}
              onClearAll={clearAllFilters}
              showSector={!lockedCategory}
              onSelectCategory={lockedCategory ? undefined : selectCategory}
            />
          </div>

        </div>
      </div>

      {/* ── Marketplace results — all filters live in the top bar above ── */}
      <div className="container-custom py-5 md:py-8">
        {/* Long-tail facets — slide-over drawer (all breakpoints), opened from
            the top bar's "All filters" button. Reads/writes the SAME URL
            params as the pill bar, so the filter pipeline downstream is
            untouched. */}
        <FilterPanel
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onClearAll={clearAllFilters}
          activeCount={activeChips.length}
          resultCount={filtered.length}
          variant="drawer"
        >
              <InvestFilterFields
                activeState={activeState}
                activeTicket={activeTicket}
                activeInvestorType={activeInvestorType}
                activeFirbOnly={activeFirbOnly}
                activeSivOnly={activeSivOnly}
                activeWholesaleOnly={activeWholesaleOnly}
                activeFreshness={activeFreshness}
                activeFeaturedOnly={activeFeaturedOnly}
                activeMinYield={activeMinYield}
                activeMaxYield={activeMaxYield}
                activeStages={activeStages}
                activeAsxSector={activeAsxSector}
                activeAsxMcap={activeAsxMcap}
                activeDivYieldMin={activeDivYieldMin}
                activeEsicOnly={activeEsicOnly}
                kindSpec={kindSpec}
                intentCountry={intentCountry ?? null}
                complianceCounts={complianceCounts}
                setParams={setParams}
                categoryMetricDefs={categoryMetricDefs}
                metricBounds={metricBounds}
                metricValues={metricValues}
              />
        </FilterPanel>

        <div>

          {/* Results */}
          <div className="min-w-0">
            {(() => {
              if (hideSubCategoryChips) return null;
              const canonicalChips = activeCategory !== "all" ? getSubCategoryChips(activeCategory) : [];
              const liveSubs = new Set(subCategories);
              // Merge canonical chips (with defined labels) + any DB subs not in canonical list
              const chipOptions = [
                ...canonicalChips.filter((c) => liveSubs.has(c.value)).map((c) => ({
                  ...c,
                  count: filtered.filter((l) => l.sub_category === c.value).length,
                })),
                ...subCategories
                  .filter((s) => !canonicalChips.some((c) => c.value === s))
                  .map((s) => ({
                    value: s,
                    label: s.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase()),
                    count: filtered.filter((l) => l.sub_category === s).length,
                  })),
              ];
              return chipOptions.length > 0 ? (
                <div className="mb-5">
                  <SubCategoryChips
                    options={chipOptions}
                    value={activeSubcategory}
                    onChange={(v) => setParams({ sub: v })}
                    label="Filter results by type"
                  />
                </div>
              ) : null;
            })()}

            <p className="text-xs text-slate-500 mb-4">
              <span className="font-bold text-slate-700">{filtered.length}</span> listing{filtered.length !== 1 ? "s" : ""} found
              {activeChips.length > 0 && (
                <span className="text-slate-500"> · from {listings.length} total</span>
              )}
            </p>

            {filtered.length === 0 ? (
              <EmptyState onClearAll={clearAllFilters} hasFilters={activeChips.length > 0} />
            ) : activeView === "map" ? (() => {
              const mapItems = filtered
                .filter((l) => l.latitude != null && l.longitude != null)
                .map((l) => ({
                  id: l.id,
                  lat: l.latitude!,
                  lng: l.longitude!,
                  label: l.title,
                  sublabel: l.sub_category ?? l.listing_kind ?? undefined,
                  href: listingUrl(l),
                }));
              const ungeocodedCount = filtered.length - mapItems.length;
              const verticalNotice = activeCategory !== "all" ? MAP_NOTICE_VERTICALS[activeCategory] : null;
              return (
                <>
                  {verticalNotice && (
                    <p className="text-xs text-slate-500 mb-3 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                      <Icon name="info" size={13} className="inline mr-1 text-amber-500" />
                      Map view shows fewer results for <span className="font-medium">{verticalNotice}</span> — most are headquartered, not site-based.
                    </p>
                  )}
                  <MapPanel
                    items={mapItems}
                    hoveredId={mapHoveredId}
                    selectedId={mapSelectedId}
                    onHover={setMapHoveredId}
                    onSelect={setMapSelectedId}
                  >
                    <div className="p-3 space-y-2">
                      <p className="text-xs text-slate-500 px-1 pb-1">
                        <span className="font-bold text-slate-700">{mapItems.length}</span> mapped
                        {ungeocodedCount > 0 && <span className="text-slate-500"> · {ungeocodedCount} without location</span>}
                      </p>
                      {mapItems.map((item) => {
                        const l = filtered.find((x) => x.id === item.id)!;
                        return (
                          <div
                            key={l.id}
                            onMouseEnter={() => setMapHoveredId(l.id)}
                            onMouseLeave={() => setMapHoveredId(null)}
                            onClick={() => setMapSelectedId(l.id === mapSelectedId ? null : l.id)}
                            className={`rounded-lg border cursor-pointer transition-colors ${l.id === mapSelectedId ? "border-amber-400 bg-amber-50" : l.id === mapHoveredId ? "border-slate-300 bg-slate-50" : "border-slate-100 bg-white"}`}
                          >
                            <InvestListingCard
                              listing={l}
                              variant="list"
                              showFirbBadge={Boolean(intentCountry) || activeFirbOnly}
                              matchScore={matchScores?.[l.id] ?? null}
                              matchReasons={matchReasons?.[l.id] ?? null}
                              advisorOptInCount={advisorOptInCounts?.[l.id] ?? 0}
                              showClaimBadge={false}
                            />
                          </div>
                        );
                      })}
                      {ungeocodedCount > 0 && (
                        <div className="pt-3 border-t border-slate-100">
                          <p className="text-xs font-semibold text-slate-500 mb-2 px-1">Location not yet geocoded</p>
                          {filtered
                            .filter((l) => l.latitude == null || l.longitude == null)
                            .map((l) => (
                              <InvestListingCard
                                key={l.id}
                                listing={l}
                                variant="list"
                                showFirbBadge={Boolean(intentCountry) || activeFirbOnly}
                                matchScore={matchScores?.[l.id] ?? null}
                              matchReasons={matchReasons?.[l.id] ?? null}
                                advisorOptInCount={advisorOptInCounts?.[l.id] ?? 0}
                                showClaimBadge={false}
                              />
                            ))}
                        </div>
                      )}
                    </div>
                  </MapPanel>
                </>
              );
            })() : activeView === "table" ? (
              <TableView listings={filtered} showFirbBadge={Boolean(intentCountry) || activeFirbOnly} />
            ) : activeView === "list" ? (
              <div className="flex flex-col gap-3">
                {filtered.map((l) => (
                  <InvestListingCard
                    key={l.id}
                    listing={l}
                    variant="list"
                    showFirbBadge={Boolean(intentCountry) || activeFirbOnly}
                    matchScore={matchScores?.[l.id] ?? null}
                              matchReasons={matchReasons?.[l.id] ?? null}
                    advisorOptInCount={advisorOptInCounts?.[l.id] ?? 0}
                    showClaimBadge={claimedSlugs ? !claimedSlugs.has(l.slug) && (l.listing_kind === "fund" || l.listing_kind === "physical_asset" || l.listing_kind === "listed_security") : false}
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5">
                {filtered.map((l) => (
                  <InvestListingCard
                    key={l.id}
                    listing={l}
                    showFirbBadge={Boolean(intentCountry) || activeFirbOnly}
                    matchScore={matchScores?.[l.id] ?? null}
                              matchReasons={matchReasons?.[l.id] ?? null}
                    advisorOptInCount={advisorOptInCounts?.[l.id] ?? 0}
                    showClaimBadge={claimedSlugs ? !claimedSlugs.has(l.slug) && (l.listing_kind === "fund" || l.listing_kind === "physical_asset" || l.listing_kind === "listed_security") : false}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sticky compare bar — renders nothing when shortlist is empty */}
      <ListingCompareBar />
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────
function EmptyState({ onClearAll, hasFilters }: { onClearAll: () => void; hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-4xl mb-3" aria-hidden="true">🔍</div>
      <h3 className="text-lg font-bold text-slate-800 mb-1">
        {hasFilters ? "No listings match your filters" : "No listings yet"}
      </h3>
      <p className="text-sm text-slate-500 max-w-sm mb-5">
        {hasFilters
          ? "Try widening the search, choosing a different category, or clearing one of the active filters."
          : "Check back soon — new opportunities are added weekly."}
      </p>
      {hasFilters && (
        <button
          type="button"
          onClick={onClearAll}
          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-sm px-5 py-2.5 transition-colors"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}

// ─── Table view ───────────────────────────────────────────────────────
function TableView({ listings, showFirbBadge }: { listings: InvestmentListing[]; showFirbBadge: boolean }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
          <tr>
            <th className="text-left px-4 py-2.5 font-bold">Listing</th>
            <th className="text-left px-3 py-2.5 font-bold">Kind</th>
            <th className="text-left px-3 py-2.5 font-bold">Sector</th>
            <th className="text-left px-3 py-2.5 font-bold">Location</th>
            <th className="text-right px-3 py-2.5 font-bold">Price</th>
            <th className="text-left px-3 py-2.5 font-bold">Flags</th>
            <th className="px-3 py-2.5"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {listings.map((l) => {
            const kind = deriveListingKind(l);
            const meta = listingKindMeta(kind);
            const price = formatListingPrice(l);
            const km = (l.key_metrics ?? {}) as Record<string, unknown>;
            const wholesaleOnly = km["wholesale_only"] === true || km["s708_required"] === true || km["accredited_only"] === true;
            return (
              <tr key={l.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={listingUrl(l)} className="font-bold text-slate-900 hover:text-amber-700 line-clamp-1">
                    {l.title}
                  </Link>
                  {l.industry && <div className="text-[0.62rem] text-slate-500 mt-0.5">{l.industry}</div>}
                </td>
                <td className="px-3 py-3">
                  <span className={`inline-flex items-center gap-1 ${meta.accent.badgeSubtle} text-[0.6rem] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border`}>
                    <Icon name={meta.icon} size={9} />
                    {meta.label}
                  </span>
                </td>
                <td className="px-3 py-3 text-xs text-slate-600 capitalize">{l.vertical.replace(/[-_]/g, " ")}</td>
                <td className="px-3 py-3 text-xs text-slate-600">
                  {l.location_state ?? "—"}{l.location_city ? ` · ${l.location_city}` : ""}
                </td>
                <td className="px-3 py-3 text-right">
                  {price ? (
                    <div>
                      <div className="text-[0.55rem] text-slate-500 uppercase">{price.label}</div>
                      <div className="text-xs font-bold text-slate-900">{price.value}</div>
                    </div>
                  ) : <span className="text-slate-300">—</span>}
                </td>
                <td className="px-3 py-3">
                  <div className="flex gap-1 flex-wrap">
                    {showFirbBadge && l.firb_eligible && <span className="bg-blue-100 text-blue-700 text-[0.55rem] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded">FIRB</span>}
                    {l.siv_complying && <span className="bg-emerald-100 text-emerald-700 text-[0.55rem] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded">SIV</span>}
                    {wholesaleOnly && <span className="bg-rose-100 text-rose-700 text-[0.55rem] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded">Wholesale</span>}
                  </div>
                </td>
                <td className="px-3 py-3 text-right">
                  <Link href={listingUrl(l)} className="text-xs font-bold text-amber-700 hover:text-amber-900 inline-flex items-center gap-0.5">
                    View
                    <Icon name="chevron-right" size={11} />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Filter fields (rendered inside <FilterPanel>) ────────────────────
interface InvestFilterFieldsProps {
  activeState: string;
  activeTicket: string;
  activeInvestorType: InvestorType;
  activeFirbOnly: boolean;
  activeSivOnly: boolean;
  activeWholesaleOnly: boolean;
  activeFreshness: string;
  activeFeaturedOnly: boolean;
  activeMinYield: string;
  activeMaxYield: string;
  activeStages: Set<string>;
  activeAsxSector: string;
  activeAsxMcap: string;
  activeDivYieldMin: string;
  activeEsicOnly: boolean;
  kindSpec: ReturnType<typeof filterSpecForKind>;
  intentCountry: string | null;
  complianceCounts: Record<string, number>;
  setParams: (updates: Record<string, string>) => void;
  categoryMetricDefs: ReadonlyArray<VerticalMetricDef>;
  metricBounds: Record<string, { min: number; max: number }>;
  metricValues: Record<string, string>;
}

const YIELD_PRESETS = [
  { label: "5–10%", low: 5, high: 10 },
  { label: "10–15%", low: 10, high: 15 },
  { label: "15%+", low: 15, high: 30 },
] as const;

const STAGE_OPTIONS = [
  { value: "pre_seed", label: "Pre-seed" },
  { value: "seed", label: "Seed" },
  { value: "series_a", label: "Series A" },
  { value: "series_b", label: "Series B" },
  { value: "pre_ipo", label: "Pre-IPO" },
  { value: "growth", label: "Growth" },
] as const;

const ASX_SECTORS = [
  "Energy", "Materials", "Industrials", "Consumer Discretionary",
  "Consumer Staples", "Health Care", "Financials", "Information Technology",
  "Communication Services", "Utilities", "Real Estate",
] as const;

const ASX_MCAP_OPTIONS = [
  { value: "nano", label: "Nano (< $50M)" },
  { value: "micro", label: "Micro ($50M–$300M)" },
  { value: "small", label: "Small ($300M–$2B)" },
  { value: "mid", label: "Mid ($2B–$10B)" },
  { value: "large", label: "Large ($10B+)" },
] as const;

function InvestFilterFields({
  activeState, activeTicket, activeInvestorType,
  activeFirbOnly, activeSivOnly, activeWholesaleOnly,
  activeFreshness, activeFeaturedOnly, activeMinYield, activeMaxYield,
  activeStages, activeAsxSector, activeAsxMcap, activeDivYieldMin, activeEsicOnly,
  kindSpec, intentCountry, complianceCounts, setParams,
  categoryMetricDefs, metricBounds, metricValues,
}: InvestFilterFieldsProps) {
  const complianceOptions = [
    { value: "firb", label: "FIRB-eligible" },
    { value: "siv", label: "SIV-complying" },
    { value: "wholesale", label: "Wholesale only" },
    ...(kindSpec.showEsicToggle ? [{ value: "esic", label: "ESIC-eligible" }] : []),
  ];
  const complianceSelected = new Set<string>();
  if (activeFirbOnly) complianceSelected.add("firb");
  if (activeSivOnly) complianceSelected.add("siv");
  if (activeWholesaleOnly) complianceSelected.add("wholesale");
  if (activeEsicOnly) complianceSelected.add("esic");
  const minYieldValue = Number(activeMinYield) || 0;
  const maxYieldValue = Number(activeMaxYield) || 30;

  return (
    <div className="space-y-5">
          <Section title="Location">
            <select
              value={activeState}
              onChange={(e) => setParams({ state: e.target.value })}
              aria-label="State"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option value="">All states</option>
              {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Section>

          <Section title="Ticket size">
            <div className="grid grid-cols-3 gap-1.5">
              {TICKET_BUCKETS.map((b) => (
                <button
                  key={b.key || "any"}
                  type="button"
                  onClick={() => setParams({ price: b.key })}
                  aria-pressed={activeTicket === b.key}
                  className={`text-[11px] font-semibold rounded-lg px-2 py-1.5 transition-colors ${
                    activeTicket === b.key
                      ? "bg-amber-500 text-slate-900 shadow-sm"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </Section>

          <Section title="Investor type">
            <select
              value={activeInvestorType}
              onChange={(e) => setParams({ investor: e.target.value })}
              aria-label="Investor type"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {INVESTOR_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <p className="text-[10px] text-slate-500 mt-1.5 leading-snug">
              Narrows out listings restricted to a category you don&apos;t qualify for. Doesn&apos;t verify status — that happens at enquiry.
            </p>
          </Section>

          <div>
            <FacetGroup
              label="Compliance & structure"
              options={complianceOptions}
              selected={complianceSelected}
              counts={complianceCounts}
              onChange={(next) =>
                setParams({
                  firb: next.has("firb") ? "eligible" : "",
                  siv: next.has("siv") ? "complying" : "",
                  wholesale: next.has("wholesale") ? "true" : "",
                  ...(kindSpec.showEsicToggle ? { esic: next.has("esic") ? "true" : "" } : {}),
                })
              }
            />
            <p className="text-[10px] text-slate-500 mt-1.5 leading-snug">
              {intentCountry ? "FIRB-eligible recommended — your visit comes via a foreign-investment page. " : ""}
              SIV = $5M+ across complying assets. Wholesale = s708 / sophisticated-investor only.
            </p>
          </div>

          {kindSpec.showYield && (
            <div>
              <DualRangeSlider
                label="Yield / return range"
                min={0}
                max={30}
                step={1}
                valueLow={minYieldValue}
                valueHigh={maxYieldValue}
                onChangeLow={(v) => setParams({ min_yield: v === 0 ? "" : String(v) })}
                onChangeHigh={(v) => setParams({ max_yield: v === 30 ? "" : String(v) })}
                formatValue={(v) => `${v}%`}
                presets={YIELD_PRESETS}
                suffix="p.a."
              />
              <p className="text-[10px] text-slate-500 mt-1.5 leading-snug">
                Matches: distribution yield, dividend yield, target IRR, historical return, target return.
              </p>
            </div>
          )}

          {categoryMetricDefs.length > 0 && (
            <div className="space-y-4">
              {categoryMetricDefs.map((def) => {
                const param = `m_${def.key}`;
                const raw = metricValues[def.key] ?? "";
                if (def.filter === "range") {
                  const b = metricBounds[def.key];
                  if (!b || b.min === b.max) return null;
                  const [loS, hiS] = raw.split("-");
                  const lo = raw ? Number(loS) || b.min : b.min;
                  const hi = raw && hiS ? Number(hiS) || b.max : b.max;
                  const step = Math.max(1, Math.round((b.max - b.min) / 20));
                  return (
                    <DualRangeSlider
                      key={def.key}
                      label={def.unit ? `${def.label} (${def.unit})` : def.label}
                      min={b.min}
                      max={b.max}
                      step={step}
                      valueLow={lo}
                      valueHigh={hi}
                      onChangeLow={(v) =>
                        setParams({ [param]: v <= b.min && hi >= b.max ? "" : `${v}-${hi}` })
                      }
                      onChangeHigh={(v) =>
                        setParams({ [param]: lo <= b.min && v >= b.max ? "" : `${lo}-${v}` })
                      }
                      formatValue={(v) =>
                        def.kind === "currency_cents" ? formatAudCompact(v) : v.toLocaleString("en-AU")
                      }
                    />
                  );
                }
                if ((def.filter === "multi" || def.filter === "select") && def.enumValues) {
                  return (
                    <FacetGroup
                      key={def.key}
                      label={def.label}
                      options={def.enumValues}
                      selected={new Set(raw ? raw.split(",") : [])}
                      onChange={(next) => setParams({ [param]: Array.from(next).join(",") })}
                      layout="grid"
                    />
                  );
                }
                if (def.filter === "toggle") {
                  const on = raw === "1";
                  return (
                    <label key={def.key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => setParams({ [param]: on ? "" : "1" })}
                        className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                      />
                      <span className="text-sm text-slate-700">{def.label}</span>
                    </label>
                  );
                }
                return null;
              })}
            </div>
          )}

                    {kindSpec.showProjectMetrics && (
            <div>
              <FacetGroup
                label="Raise stage"
                options={STAGE_OPTIONS}
                selected={activeStages as Set<string>}
                onChange={(next) => setParams({ stage: Array.from(next).join(",") })}
                layout="grid"
              />
            </div>
          )}

          {kindSpec.showAsxFilter && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                  ASX Sector (GICS)
                </label>
                <select
                  value={activeAsxSector}
                  onChange={(e) => setParams({ sector: e.target.value })}
                  aria-label="ASX Sector"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <option value="">All sectors</option>
                  {ASX_SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <FacetGroup
                  label="Market cap"
                  options={ASX_MCAP_OPTIONS}
                  selected={new Set(activeAsxMcap ? [activeAsxMcap] : [])}
                  onChange={(next) => setParams({ mcap: Array.from(next)[0] ?? "" })}
                  layout="grid"
                />
              </div>
              <div>
                <RangeSlider
                  label="Min dividend yield"
                  min={0}
                  max={12}
                  step={0.5}
                  value={Number(activeDivYieldMin) || 0}
                  onChange={(v) => setParams({ div_yield_min: v === 0 ? "" : String(v) })}
                  formatValue={(v) => v === 0 ? "Any" : `${v}%`}
                />
              </div>
            </div>
          )}

          <Section title="Listing status">
            <select
              value={activeFreshness}
              onChange={(e) => setParams({ fresh: e.target.value })}
              aria-label="Listing freshness"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option value="">Any status</option>
              <option value="new_this_week">New this week</option>
              <option value="closing_soon">Closing soon</option>
            </select>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer mt-2.5">
              <input
                type="checkbox"
                checked={activeFeaturedOnly}
                onChange={(e) => setParams({ featured: e.target.checked ? "true" : "" })}
                className="accent-amber-500 w-4 h-4 shrink-0"
              />
              Featured / Premium only
            </label>
          </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-2">{title}</h3>
      {children}
    </section>
  );
}
