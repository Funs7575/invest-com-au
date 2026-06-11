"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { Broker } from "@/lib/types";
import { trackEvent } from "@/lib/tracking";
import SocialProofCounter from "@/components/SocialProofCounter";
import { FeesFreshnessIndicator } from "@/components/FeesFreshnessIndicator";
import { getMostRecentFeeCheck } from "@/lib/utils";
import Icon from "@/components/Icon";
import BottomSheet from "@/components/BottomSheet";
import { getSponsorSortPriority, isSponsored, getPlacementWinners, type PlacementWinner } from "@/lib/sponsorship";

import CompareDesktopTable from "./_components/CompareDesktopTable";
import CompareSelectionBar from "./_components/CompareSelectionBar";
import CompareFooter from "./_components/CompareFooter";
import CompareCrossSellBanner from "@/components/CompareCrossSellBanner";
import FeeImpactVisualiser from "@/components/FeeImpactVisualiser";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import { celebrateMilestone } from "@/lib/celebrate";
import SearchInput from "@/components/directory/SearchInput";
import FilterChips, { type FilterChip } from "@/components/directory/FilterChips";
import EmptyState from "@/components/directory/EmptyState";
import ResultCount from "@/components/directory/ResultCount";
import { FilterPill, FilterPopover } from "@/components/directory/FilterPill";
import type { ABTestConfig } from "@/lib/ab-test";
import { createClient } from "@/lib/supabase/client";
import {
  CATEGORY_ALIASES,
  CATEGORY_SCHEMAS,
  DEFAULT_COST_INPUTS,
  describeCostInputs,
  SCENARIOS,
  applyComplianceGates,
  filterBrokers,
  rankBrokers,
  scenarioCategory,
  sortRankedBrokers,
  updateShortlist,
  type CompareCategory,
  type CostInputs,
  type FeatureFilter,
  type ScenarioMode,
  type SortCol,
} from "@/lib/compare-engine";
import { SHOW_EDITORIAL_BADGES, SHOW_RATINGS } from "@/lib/compliance-config";

// Licence-mode default: rating sort implies an editorial ranking, which
// factual_only mode (no AFSL) must not lead with — cheapest-first is the
// factual ordering. See lib/compliance-config.ts.
const DEFAULT_SORT_COL: SortCol = SHOW_RATINGS ? "rating" : "estimated_annual_cost";
const DEFAULT_SORT_DIR: 1 | -1 = SHOW_RATINGS ? -1 : 1;

const platformTypes: { key: CompareCategory; label: string; short?: string }[] = Object.values(CATEGORY_SCHEMAS).map((schema) => ({
  key: schema.key,
  label: schema.label,
  short: schema.shortLabel,
}));

/** Map URL ?category= values to platform category keys */
const CATEGORY_TO_FILTER: Record<string, CompareCategory> = CATEGORY_ALIASES;

const maxFeeOptions = [
  { value: 999, label: 'Any' },
  { value: 0, label: '$0' },
  { value: 5, label: '≤ $5' },
  { value: 10, label: '≤ $10' },
  { value: 20, label: '≤ $20' },
];

const minRatingOptions = [
  { value: 0, label: 'Any' },
  { value: 4.5, label: '4.5+' },
  { value: 4.0, label: '4.0+' },
  { value: 3.5, label: '3.5+' },
];

/** Initial mobile-card page size; "Show more" reveals the next batch. */
const MOBILE_PAGE_SIZE = 15;
const MOBILE_PAGE_STEP = 25;

const featureFilterMeta: Record<FeatureFilter, { label: string; icon: string }> = {
  chess: { label: 'CHESS Sponsored', icon: 'shield' },
  free: { label: '$0 Trades', icon: 'zap' },
  us: { label: 'US Shares', icon: 'globe' },
  smsf: { label: 'SMSF Support', icon: 'building' },
  'low-fx': { label: 'Low FX (<0.5%)', icon: 'dollar-sign' },
  'has-deal': { label: 'Has Deal', icon: 'tag' },
};

function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <span ref={ref} className="relative ml-1 inline-flex">
      <button
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 text-slate-500 text-[0.69rem] font-bold cursor-help"
        aria-label="More info"
        type="button"
      >
        ?
      </button>
      {open && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 bg-slate-800 text-white text-xs rounded-lg z-10 max-w-55 whitespace-normal text-center leading-tight shadow-lg" role="tooltip">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-slate-800" />
        </span>
      )}
    </span>
  );
}

export default function CompareClient({ brokers }: { brokers: Broker[] }) {
  const searchParams = useSearchParams();

  // Derive initial filter/query from URL params (?filter= or ?category=)
  const urlFilter = searchParams.get("filter");
  const urlCategory = searchParams.get("category");
  const initialFilter: CompareCategory = (() => {
    if (urlFilter && platformTypes.some(fl => fl.key === urlFilter)) return urlFilter as CompareCategory;
    if (urlCategory && CATEGORY_TO_FILTER[urlCategory]) return CATEGORY_TO_FILTER[urlCategory];
    // Cold organic landing (no params at all): open on share trading — the
    // category a first-time visitor means by "compare brokers". The mixed
    // "All" view put three same-rated affiliate rows on top, which read as
    // pay-to-play (2026-06-10 funnel audit). 'All' stays one tap away.
    // Param-driven entries (search, quiz ?ids handoff) keep the full set so
    // pre-selected items can't be filtered out of view.
    if (!searchParams.get("q") && !searchParams.get("ids")) return "share-trading";
    return 'all';
  })();
  const urlQuery = searchParams.get("q") || "";

  // Sort state is URL-persisted so shared/bookmarked compare pages recreate
  // exactly what the recipient expected to see (critical for "look at this
  // broker ranking" affiliate share-outs).
  const validSortCols: SortCol[] = ['name', 'asx_fee_value', 'us_fee_value', 'fx_rate', 'rating', 'estimated_annual_cost', 'rank_score'];
  const urlSortCol = searchParams.get("sort");
  const initialSortCol: SortCol = (urlSortCol && (validSortCols as string[]).includes(urlSortCol))
    ? (urlSortCol as SortCol)
    : DEFAULT_SORT_COL;
  const urlSortDir = searchParams.get("dir");
  const initialSortDir: 1 | -1 = urlSortDir === 'asc' ? 1 : urlSortDir ? -1 : DEFAULT_SORT_DIR;

  // Quiz handoff: when the quiz routes here with ?ids=slug1,slug2,slug3 and
  // optional ?quiz_priority signals, seed the comparison so the user lands
  // ready to act. This converts the cold compare experience (filter from
  // scratch) into a warm one (their top quiz matches already selected).
  const urlIds = searchParams.get("ids");
  const urlQuizPriority = searchParams.get("quiz_priority");
  const initialSelected = (() => {
    if (!urlIds) return new Set<string>();
    const slugs = urlIds.split(",").map(s => s.trim()).filter(Boolean).slice(0, 4);
    const validSlugs = new Set(brokers.map(b => b.slug));
    return new Set(slugs.filter(s => validSlugs.has(s)));
  })();
  const initialFeatures = (() => {
    const next = new Set<FeatureFilter>();
    if (urlQuizPriority === "safety") next.add("chess");
    return next;
  })();
  const [searchQuery, setSearchQuery] = useState(urlQuery);
  const [activeFilter, setActiveFilter] = useState<CompareCategory>(initialFilter);
  const [activeFeatures, setActiveFeatures] = useState<Set<FeatureFilter>>(initialFeatures);
  const [maxFee, setMaxFee] = useState(999);
  const [minRating, setMinRating] = useState(0);
  // Mobile cards are paged — the full list renders a ~35,000px column on
  // small screens (DISC-20260610-E). Desktop table is unaffected. Paging
  // state carries the filter signature so a filter change resets it during
  // render (React's "adjust state when props change" pattern — no effect).
  const [mobilePaging, setMobilePaging] = useState({ signature: "", count: MOBILE_PAGE_SIZE });
  const resultsRef = useRef<HTMLDivElement>(null);
  const initialSortColForQuiz: SortCol =
    urlQuizPriority === "fees" ? "asx_fee_value" : initialSortCol;
  const initialSortDirForQuiz: 1 | -1 = urlQuizPriority === "fees" ? 1 : initialSortDir;
  const [sortCol, setSortCol] = useState<SortCol>(initialSortColForQuiz);
  const [sortDir, setSortDir] = useState<1 | -1>(initialSortDirForQuiz);
  const [selected, setSelected] = useState<Set<string>>(initialSelected);
  const [showMobileCompare, setShowMobileCompare] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [openPill, setOpenPill] = useState<string | null>(null);
  // Track which filter the user last expanded mobile columns for — comparing
  // to activeFilter gives derived "showAllMobileColumns" that auto-resets on
  // category change without a useEffect.
  const [columnExpandedForFilter, setColumnExpandedForFilter] = useState<string | null>(null);
  const showAllMobileColumns = columnExpandedForFilter === activeFilter;
  const [scenario, setScenario] = useState<ScenarioMode | "none">((searchParams.get("scenario") as ScenarioMode) || "none");
  const [shareLinkCopied, setShareLinkCopied] = useState(false);
  const [costInputs, setCostInputs] = useState<CostInputs>(DEFAULT_COST_INPUTS);
  const scenarioPanelRef = useRef<HTMLDetailsElement>(null);

  // Sync URL when filter, search or sort changes (for sharing/bookmarking).
  // Using replaceState (not push) so the back button doesn't get polluted
  // with every keystroke.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (activeFilter === 'all') {
      url.searchParams.delete('filter');
    } else {
      url.searchParams.set('filter', activeFilter);
    }
    if (searchQuery.trim()) {
      url.searchParams.set('q', searchQuery.trim());
    } else {
      url.searchParams.delete('q');
    }
    if (sortCol === DEFAULT_SORT_COL) {
      url.searchParams.delete('sort');
    } else {
      url.searchParams.set('sort', sortCol);
    }
    if (sortDir === -1) {
      url.searchParams.delete('dir');
    } else {
      url.searchParams.set('dir', 'asc');
    }
    if (scenario === 'none') {
      url.searchParams.delete('scenario');
    } else {
      url.searchParams.set('scenario', scenario);
    }
    window.history.replaceState({}, '', url.toString());
  }, [activeFilter, searchQuery, sortCol, sortDir, scenario]);

  // Marketplace campaign allocation
  const [campaignWinners, setCampaignWinners] = useState<PlacementWinner[]>([]);
  const [cpcCampaigns, setCpcCampaigns] = useState<PlacementWinner[]>([]);

  // A/B tests for CTA variations
  const [activeABTests, setActiveABTests] = useState<ABTestConfig[]>([]);

  useEffect(() => {
    // Fetch featured placement winners
    getPlacementWinners("compare-top").then(setCampaignWinners);
    // Fetch CPC campaigns for click attribution
    getPlacementWinners("compare-cpc").then(setCpcCampaigns);
    // Fetch active A/B tests for this page
    const supabase = createClient();
    supabase
      .from("site_ab_tests")
      .select("id, name, test_type, variant_a, variant_b, traffic_split, status")
      .eq("status", "running")
      .eq("page", "/compare")
      .then(({ data }) => {
        if (data) setActiveABTests(data as ABTestConfig[]);
      });
  }, []);

  // Build a map of broker_slug → campaign_id for CPC attribution
  const cpcCampaignMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const w of cpcCampaigns) {
      if (!map.has(w.broker_slug)) map.set(w.broker_slug, w.campaign_id);
    }
    return map;
  }, [cpcCampaigns]);

  // Build a map of platform filter key → top broker logo URLs (up to 4 per category)
  const filterLogos = useMemo(() => {
    const PLATFORM_KEY_MAP = CATEGORY_SCHEMAS;

    const result: Record<string, { slug: string; name: string; logo_url?: string; color: string }[]> = {};

    for (const [filterKey, schema] of Object.entries(PLATFORM_KEY_MAP)) {
      let matches = brokers.filter(b => schema.platformTypes.includes(b.platform_type) || (schema.key === 'crypto-exchanges' && b.is_crypto));
      if (schema.include) matches = matches.filter(schema.include);
      // Sort by rating desc, take top 4 with logo_url
      const withLogos = matches
        .filter(b => b.logo_url)
        .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
        .slice(0, 4)
        .map(b => ({ slug: b.slug, name: b.name, logo_url: b.logo_url, color: b.color }));
      result[filterKey] = withLogos;
    }

    // "all" gets the top-rated from across all brokers
    result['all'] = brokers
      .filter(b => b.logo_url)
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      .slice(0, 5)
      .map(b => ({ slug: b.slug, name: b.name, logo_url: b.logo_url, color: b.color }));

    return result;
  }, [brokers]);

  function toggleSelected(slug: string) {
    setSelected(prev => {
      const before = Array.from(prev);
      const after = updateShortlist(before, slug, 4);
      if (!prev.has(slug) && after.includes(slug)) {
        trackEvent('compare_select', { broker: slug }, '/compare');
      }
      return new Set(after);
    });
  }

  // Sync filter/query when URL params change (e.g. browser back/forward).
  // This URL→state sync predates react-hooks v5; rewriting to a subscription
  // form is out of scope for this PR (see eslint config — set-state-in-effect
  // is intentionally `warn` for legacy code).
  /* eslint-disable react-hooks/set-state-in-effect -- pre-existing legacy URL→state sync, refactor out of scope */
  useEffect(() => {
    const q = searchParams.get("q") || "";
    setSearchQuery(q);
    const f = searchParams.get("filter");
    const c = searchParams.get("category");
    if (f && platformTypes.some(fl => fl.key === f)) {
      setActiveFilter(f as CompareCategory);
    } else if (c && CATEGORY_TO_FILTER[c]) {
      setActiveFilter(CATEGORY_TO_FILTER[c]);
    } else if (!f && !c) {
      setActiveFilter('all');
    }
  }, [searchParams]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Scroll to results when filter changes (not on initial load)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [activeFilter]);

  function handleSort(col: SortCol) {
    if (sortCol === col) {
      setSortDir(d => (d === 1 ? -1 : 1) as 1 | -1);
    } else {
      setSortCol(col);
      setSortDir(col === 'rating' ? -1 : 1);
    }
  }

  // First genuine comparison act (2+ platforms pinned) = the first_compare
  // milestone (Northstar D7). celebrateMilestone is once-ever internally.
  useEffect(() => {
    if (selected.size >= 2) celebrateMilestone("first_compare");
  }, [selected.size]);

  const effectiveCategory = scenarioCategory(scenario, activeFilter);
  const schema = applyComplianceGates(CATEGORY_SCHEMAS[effectiveCategory]);
  const filtered = useMemo(() => filterBrokers(brokers, {
    category: activeFilter,
    features: activeFeatures,
    maxFee,
    minRating,
    searchQuery,
    scenario,
  }), [brokers, activeFilter, activeFeatures, maxFee, minRating, searchQuery, scenario]);

  const ranked = useMemo(() => rankBrokers(filtered, scenario, costInputs), [filtered, scenario, costInputs]);

  // Any filter change restarts mobile paging from the first batch (guarded
  // render-time reset — equivalent to keying the list on the signature).
  const filterSignature = `${activeFilter}|${maxFee}|${minRating}|${searchQuery}|${scenario}|${[...activeFeatures].sort().join(",")}`;
  if (mobilePaging.signature !== filterSignature) {
    setMobilePaging({ signature: filterSignature, count: MOBILE_PAGE_SIZE });
  }
  const mobileVisibleCount = mobilePaging.count;

  const sortedRows = useMemo(() => {
    const campaignWinnerSlugs = new Set(campaignWinners.map(w => w.broker_slug));
    return sortRankedBrokers(ranked, sortCol, sortDir).sort((a, b) => {
      const aCampaign = campaignWinnerSlugs.has(a.broker.slug) ? 0 : 1;
      const bCampaign = campaignWinnerSlugs.has(b.broker.slug) ? 0 : 1;
      if (aCampaign !== bCampaign) return aCampaign - bCampaign;
      const aPriority = getSponsorSortPriority(a.broker.sponsorship_tier);
      const bPriority = getSponsorSortPriority(b.broker.sponsorship_tier);
      return aPriority - bPriority;
    });
  }, [ranked, sortCol, sortDir, campaignWinners]);

  const sorted = useMemo(() => sortedRows.map(row => row.broker), [sortedRows]);

  // Compute editor picks — "Editor's Choice" / "Best Value" / "Lowest Fees"
  // are editorial labels, gated off in factual_only licence mode.
  const editorPicks = useMemo(() => {
    const picks: Record<string, string> = {};
    if (!SHOW_EDITORIAL_BADGES) return picks;
    const nonCrypto = sorted.filter(b => !b.is_crypto && !isSponsored(b));
    if (nonCrypto.length > 0) {
      const cheapest = nonCrypto.reduce((a, b) => (a.asx_fee_value ?? 999) <= (b.asx_fee_value ?? 999) ? a : b);
      const bestOverall = nonCrypto.reduce((a, b) => (a.rating ?? 0) >= (b.rating ?? 0) ? a : b);
      const bestValue = nonCrypto
        .filter(b => b.chess_sponsored && (b.asx_fee_value ?? 999) <= 5)
        .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0];

      if (cheapest) picks[cheapest.slug] = 'Lowest Fees';
      if (bestOverall && bestOverall.slug !== cheapest.slug) picks[bestOverall.slug] = "Editor's Choice";
      if (bestValue && !picks[bestValue.slug]) picks[bestValue.slug] = 'Best Value';
    }
    return picks;
  }, [sorted]);

  const sortArrow = (col: SortCol) => {
    if (sortCol !== col) return <span className="ml-1 opacity-40 inline-block transition-transform">⇅</span>;
    return (
      <span className={`ml-1 inline-block transition-transform duration-200 ${sortDir === 1 ? "" : "rotate-180"}`}>
        ↑
      </span>
    );
  };

  /** Overlapping logo avatars for filter pills */
  function LogoStack({ logos, max = 4, size = 20 }: { logos: { slug: string; name: string; logo_url?: string; color: string }[]; max?: number; size?: number }) {
    const shown = logos.slice(0, max);
    if (shown.length === 0) return null;
    const overlap = Math.round(size * 0.3); // 30% overlap
    return (
      <span className="inline-flex items-center ml-1.5" style={{ marginRight: `${overlap}px` }}>
        {shown.map((b, i) => {
          const logoSrc = b.logo_url?.endsWith('.ico')
            ? `/logos/png/${b.slug}.png`
            : b.logo_url;
          return (
            <span
              key={b.slug}
              className="rounded-full border-2 border-white bg-white overflow-hidden shrink-0 shadow-sm"
              style={{
                width: size, height: size,
                marginLeft: i === 0 ? 0 : -overlap,
                zIndex: shown.length - i,
                position: 'relative',
              }}
              title={b.name}
            >
              {logoSrc ? (
                <Image
                  src={logoSrc}
                  alt={b.name}
                  fill
                  sizes={`${size}px`}
                  className="object-contain"
                  loading="lazy"
                  unoptimized
                />
              ) : (
                <span
                  className="w-full h-full flex items-center justify-center text-[0.45rem] font-bold"
                  style={{ background: `${b.color}20`, color: b.color }}
                >
                  {b.name.charAt(0)}
                </span>
              )}
            </span>
          );
        })}
        {logos.length > max && (
          <span
            className="rounded-full border-2 border-white bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 shadow-sm"
            style={{
              width: size, height: size,
              marginLeft: -overlap,
              zIndex: 0,
              position: 'relative',
              fontSize: size * 0.35,
              fontWeight: 700,
            }}
          >
            +{logos.length - max}
          </span>
        )}
      </span>
    );
  }

  return (
    <div className="pt-5 pb-8 md:py-12">
      <div className="container-custom">
        {/* Breadcrumb now lives in the shared DirectoryHero (page.tsx); this
            client only renders the meta row + table below it. */}
        {/* Meta row — the H1 + subhead live in page.tsx (single source, streamed
            for crawlers); here we keep only freshness + trust/utility links. */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mb-2 md:mb-3 text-[0.62rem] md:text-xs text-slate-500">
          <FeesFreshnessIndicator lastChecked={getMostRecentFeeCheck(brokers)} variant="inline" />
          <span className="text-slate-300">·</span>
          <SocialProofCounter />
          <span className="text-slate-300">·</span>
          <Link href="/methodology" className="underline hover:text-slate-700">Methodology</Link>
          <span className="text-slate-300">·</span>
          <button
            onClick={() => {
              const url = typeof window !== 'undefined' ? window.location.href : '';
              if (navigator.share) {
                navigator.share({ title: 'Compare Platforms — invest.com.au', url }).catch(() => {});
              } else {
                navigator.clipboard.writeText(url).then(() => {
                  setShareLinkCopied(true);
                  setTimeout(() => setShareLinkCopied(false), 2000);
                }).catch(() => {});
              }
            }}
            aria-live="polite"
            aria-label={shareLinkCopied ? "Link copied to clipboard" : "Share this view — copy link"}
            className="underline hover:text-slate-700"
          >
            {shareLinkCopied ? "Copied!" : "Share this view"}
          </button>
          <span className="text-slate-300">·</span>
          <Link href="/how-we-earn" className="underline hover:text-slate-700">How we earn</Link>
        </div>

        {/* Deal/TradingView promo moved into the page hero (see app/compare/page.tsx
            dealPromo + <DirectoryHero promo=…>) so it's part of the header rather
            than an extra band above the table. */}

        <details ref={scenarioPanelRef} className="group mb-2.5">
          <summary className="flex items-center justify-between gap-2 cursor-pointer list-none rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm hover:border-slate-300">
            <span className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <Icon name="sliders" size={15} className="text-blue-700" />
              Rank by scenario &amp; estimate true cost
              <span className="hidden sm:inline text-[0.62rem] font-semibold text-slate-600">— optional power tools</span>
              {scenario !== 'none' && (
                <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-white">
                  {SCENARIOS.find((s) => s.key === scenario)?.label}
                </span>
              )}
            </span>
            <Icon name="chevron-down" size={16} className="text-slate-400 transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-3 grid gap-3 lg:grid-cols-[1.1fr_0.9fr]" aria-label="Scenario and true-cost calculator">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Scenario modes</p>
                <h2 className="text-lg font-extrabold text-slate-900">Rank by a general scenario</h2>
                <p className="text-xs text-slate-500 mt-1">{schema.description} Rankings are factual comparisons, not personal financial advice or a recommendation.</p>
              </div>
              <select
                value={scenario}
                onChange={(e) => setScenario(e.target.value as ScenarioMode | "none")}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold"
                aria-label="Scenario mode"
              >
                <option value="none">No scenario</option>
                {SCENARIOS.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              {SCENARIOS.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setScenario(item.key)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${scenario === item.key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                  title={item.description}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">True-cost calculator</p>
            <h2 className="text-lg font-extrabold text-slate-900">Estimate annual platform cost</h2>
            <p className="text-xs text-slate-500 mb-3">Inputs are used only for the indicative annual-cost column. Check provider terms before acting.</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                ['tradesPerMonth', 'ASX trades/mo'],
                ['averageTradeSize', 'Avg ASX trade'],
                ['usTradesPerMonth', 'US trades/mo'],
                ['averageUsTradeSize', 'Avg US trade'],
                ['portfolioBalance', 'Portfolio/balance'],
              ].map(([key, label]) => (
                <label key={key} className="text-[0.7rem] font-semibold text-slate-600">
                  {label}
                  <input
                    type="number" inputMode="decimal"
                    min="0"
                    value={costInputs[key as keyof CostInputs]}
                    onChange={(e) => setCostInputs((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
        </details>

        {/* Desktop Filter System */}
        <div className="hidden md:block mb-3 space-y-2.5">
          {/* Search leads the toolbar (mirrors /invest /advisors) */}
          <div className="max-w-md">
            <SearchInput
              id="compare-search"
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search platforms by name..."
              ariaLabel="Search platforms by name"
            />
          </div>
          {/* Row 1: Platform type pills with logos */}
          <div className="flex flex-nowrap gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1" role="group" aria-label="Filter by platform type">
            {platformTypes.map(f => (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                aria-pressed={activeFilter === f.key}
                className={`shrink-0 px-4 py-2 text-sm font-medium rounded-full transition-all inline-flex items-center gap-0.5 ${
                  activeFilter === f.key
                    ? 'bg-slate-900 text-white shadow-sm scale-105'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:scale-[1.02]'
                }`}
              >
                {f.label}
                {filterLogos[f.key]?.length > 0 && (
                  <LogoStack
                    logos={filterLogos[f.key]}
                    max={f.key === 'all' ? 5 : 3}
                    size={activeFilter === f.key ? 22 : 20}
                  />
                )}
              </button>
            ))}
          </div>
          
          {/* Row 2: compact facet pills — features · max fee · rating (de-bloated
              from 6 inline toggles + 2 dropdowns into popovers, mirroring /invest) */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <FilterPill icon="sliders" label="Features" active={activeFeatures.size > 0} open={openPill === "features"}
                value={activeFeatures.size > 0 ? String(activeFeatures.size) : undefined}
                onClick={() => setOpenPill((o) => (o === "features" ? null : "features"))} />
              <FilterPopover open={openPill === "features"} onClose={() => setOpenPill(null)} label="Features">
                <p className="text-xs font-bold text-slate-900 mb-2">Features</p>
                <div className="flex flex-col gap-1.5">
                  {schema.featureFilters.map((key) => {
                    const f = featureFilterMeta[key];
                    const on = activeFeatures.has(key);
                    return (
                      <button key={key} type="button"
                        aria-pressed={on}
                        onClick={() => setActiveFeatures((prev) => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next; })}
                        className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-xs font-semibold transition-colors ${on ? "border-amber-400 bg-amber-50 text-amber-800" : "border-slate-200 text-slate-700 hover:border-slate-300"}`}>
                        <Icon name={f.icon} size={13} className={on ? "text-amber-600" : "text-slate-400"} />
                        <span className="flex-1 text-left">{f.label}</span>
                        {on && <Icon name="check" size={13} className="text-amber-600" />}
                      </button>
                    );
                  })}
                </div>
              </FilterPopover>
            </div>
            <div className="relative">
              <FilterPill icon="dollar-sign" label="Max fee" active={maxFee < 999} open={openPill === "fee"}
                value={maxFee < 999 ? maxFeeOptions.find((o) => o.value === maxFee)?.label : undefined}
                onClick={() => setOpenPill((o) => (o === "fee" ? null : "fee"))} />
              <FilterPopover open={openPill === "fee"} onClose={() => setOpenPill(null)} label="Max ASX fee">
                <p className="text-xs font-bold text-slate-900 mb-2">Max ASX brokerage</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {maxFeeOptions.map((o) => (
                    <button key={o.value} type="button" onClick={() => { setMaxFee(o.value); setOpenPill(null); }}
                      className={`px-2 py-2 rounded-lg border text-xs font-semibold transition-colors ${maxFee === o.value ? "border-amber-400 bg-amber-50 text-amber-800" : "border-slate-200 text-slate-700 hover:border-slate-300"}`}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </FilterPopover>
            </div>
            {SHOW_RATINGS && (
            <div className="relative">
              <FilterPill icon="star" label="Rating" active={minRating > 0} open={openPill === "rating"}
                value={minRating > 0 ? minRatingOptions.find((o) => o.value === minRating)?.label : undefined}
                onClick={() => setOpenPill((o) => (o === "rating" ? null : "rating"))} />
              <FilterPopover open={openPill === "rating"} onClose={() => setOpenPill(null)} label="Minimum rating">
                <p className="text-xs font-bold text-slate-900 mb-2">Minimum rating</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {minRatingOptions.map((o) => (
                    <button key={o.value} type="button" onClick={() => { setMinRating(o.value); setOpenPill(null); }}
                      className={`px-2.5 py-2 rounded-lg border text-xs font-semibold transition-colors ${minRating === o.value ? "border-amber-400 bg-amber-50 text-amber-800" : "border-slate-200 text-slate-700 hover:border-slate-300"}`}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </FilterPopover>
            </div>
            )}
          </div>
          {/* Active filter chips — one removable chip per active filter */}
          <FilterChips
            chips={[
              ...(activeFilter !== 'all' ? [{ label: platformTypes.find(f => f.key === activeFilter)?.label ?? activeFilter, onClear: () => setActiveFilter('all') }] as FilterChip[] : []),
              ...Array.from(activeFeatures).map((key): FilterChip => ({
                label: featureFilterMeta[key]?.label ?? key,
                onClear: () => setActiveFeatures(prev => { const next = new Set(prev); next.delete(key); return next; }),
              })),
              ...(maxFee < 999 ? [{ label: `ASX Fee ≤$${maxFee}`, onClear: () => setMaxFee(999) }] as FilterChip[] : []),
              ...(minRating > 0 ? [{ label: `Rating ${minRating}+`, onClear: () => setMinRating(0) }] as FilterChip[] : []),
              ...(searchQuery.trim() ? [{ label: `"${searchQuery.trim()}"`, onClear: () => setSearchQuery('') }] as FilterChip[] : []),
            ]}
            onClearAll={() => { setActiveFilter('all'); setActiveFeatures(new Set()); setMaxFee(999); setMinRating(0); setSearchQuery(''); }}
          />
        </div>

        {/* Mobile: Filter + Search inline row */}
        <div className="md:hidden flex items-center gap-2 mb-3">
          <button
            onClick={() => setSheetOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 min-h-11 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full hover:bg-slate-200 transition-colors shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" d="M4 6h16M7 12h10M10 18h4" />
            </svg>
            {activeFilter !== 'all'
              ? platformTypes.find(f => f.key === activeFilter)?.label
              : activeFeatures.size > 0
                ? `${activeFeatures.size} filter${activeFeatures.size > 1 ? 's' : ''}`
                : (sortCol !== DEFAULT_SORT_COL || sortDir !== DEFAULT_SORT_DIR)
                  ? `Sort: ${schema.sortOptions.find(s => s.col === sortCol)?.label ?? sortCol} ${sortDir === 1 ? '↑' : '↓'}`
                  : 'Filter & Sort'}
          </button>
          <SearchInput
            id="compare-search-mobile"
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search..."
            ariaLabel="Search platforms"
            className="flex-1"
          />
          <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Filter & Sort">
            {/* Sort */}
            <div className="mb-4">
              <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500 mb-2">Sort by</p>
              <div className="flex flex-wrap gap-2">
                {schema.sortOptions.map(s => (
                  <button
                    key={s.col}
                    onClick={() => handleSort(s.col)}
                    className={`px-3 py-2 text-sm font-medium rounded-full transition-colors ${
                      sortCol === s.col
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {s.label} {sortCol === s.col ? (sortDir === 1 ? '↑' : '↓') : ''}
                  </button>
                ))}
              </div>
            </div>
            {/* Platform Type */}
            <div className="mb-4">
              <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500 mb-2">Platform type</p>
              <div className="flex flex-wrap gap-2">
                {platformTypes.map(f => (
                  <button
                    key={f.key}
                    onClick={() => setActiveFilter(f.key)}
                    className={`px-3 py-2 text-sm font-medium rounded-full inline-flex items-center gap-0.5 ${
                      activeFilter === f.key
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {f.short || f.label}
                    {filterLogos[f.key]?.length > 0 && (
                      <LogoStack logos={filterLogos[f.key]} max={3} size={18} />
                    )}
                  </button>
                ))}
              </div>
            </div>
            {/* Features */}
            <div className="mb-4">
              <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500 mb-2">Features</p>
              <div className="flex flex-wrap gap-2">
                {schema.featureFilters.map(key => {
                  const f = featureFilterMeta[key];
                  return (
                  <button
                    key={key}
                    onClick={() => setActiveFeatures(prev => {
                      const next = new Set(prev);
                      if (next.has(key)) next.delete(key); else next.add(key);
                      return next;
                    })}
                    className={`px-3 py-2 text-sm font-medium rounded-full ${
                      activeFeatures.has(key)
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {f.label}
                  </button>
                );})}
              </div>
            </div>
            {/* Fee & Rating */}
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="compare-max-fee" className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500 mb-2 block">Max ASX Fee</label>
                <select id="compare-max-fee" value={maxFee} onChange={e => setMaxFee(Number(e.target.value))} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm">
                  {maxFeeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              {SHOW_RATINGS && (
              <div>
                <label htmlFor="compare-min-rating" className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500 mb-2 block">Min Rating</label>
                <select id="compare-min-rating" value={minRating} onChange={e => setMinRating(Number(e.target.value))} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm">
                  {minRatingOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              )}
            </div>
            <div className="flex gap-3 pt-2 border-t border-slate-100">
              <button
                onClick={() => { setActiveFilter('all'); setActiveFeatures(new Set()); setMaxFee(999); setMinRating(0); }}
                className="flex-1 py-3 min-h-12 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Clear All
              </button>
              <button
                onClick={() => setSheetOpen(false)}
                className="flex-1 py-3 min-h-12 text-sm font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors"
              >
                Show Results
              </button>
            </div>
          </BottomSheet>
        </div>

        {/* Result count — sr-only aria-live for all sizes; ResultCount visible on mobile */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {sorted.length} {sorted.length === 1 ? 'platform' : 'platforms'} found
        </div>
        <div className="md:hidden flex items-center justify-between mb-2">
          <ResultCount total={sorted.length} noun="platforms" className="text-[0.62rem]" />
          {/* U2 — show more columns affordance */}
          {schema.columns.length > 4 && (
            <button
              type="button"
              aria-expanded={showAllMobileColumns}
              onClick={() => setColumnExpandedForFilter(prev => prev === activeFilter ? null : activeFilter)}
              className="text-[0.62rem] font-semibold text-blue-700 hover:text-blue-800"
            >
              {showAllMobileColumns ? 'Fewer columns' : `+${schema.columns.length - 4} columns`}
            </button>
          )}
        </div>

        {/* Quiz prompt — hidden on mobile to save space */}
        <div className="hidden md:flex items-center gap-2 mb-4 text-xs text-slate-500">
          <span>Not sure which to pick?</span>
          <Link href="/get-matched" className="text-blue-700 font-semibold hover:text-blue-800 transition-colors">
            Take the 60-sec quiz →
          </Link>
        </div>

        {/* Cross-vertical cross-sell — shows once user has 2+ selected and a
            specific vertical filter active. Dismissable per session per
            vertical via sessionStorage. Labels derived from platformTypes
            so we don't duplicate vertical metadata. */}
        <CompareCrossSellBanner
          vertical={activeFilter}
          selectedCount={selected.size}
          verticalLabels={Object.fromEntries(
            platformTypes.map((p) => [p.key, p.short ?? p.label]),
          )}
        />

        {/* D9: the cost engine's inputs, visible without opening the power
            tools — tapping opens the scenario panel. */}
        <button
          type="button"
          onClick={() => {
            const panel = scenarioPanelRef.current;
            if (panel) {
              panel.open = true;
              panel.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }}
          aria-label="Edit the inputs behind the estimated annual cost column"
          className="mb-2.5 inline-flex max-w-full flex-wrap items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-left text-xs text-blue-900 transition-colors hover:bg-blue-100"
        >
          <Icon name="sliders" size={12} className="shrink-0" />
          <span>
            Costs shown for: <strong className="font-bold">{describeCostInputs(costInputs, scenario !== "none" ? SCENARIOS.find((item) => item.key === scenario)?.label : null)}</strong>
          </span>
          <span className="font-semibold underline">Change</span>
        </button>

        {/* Desktop Table */}
        <div ref={resultsRef} className="scroll-mt-16">
        <CompareDesktopTable
          rows={sortedRows}
          schema={schema}
          activeFilter={activeFilter}
          searchQuery={searchQuery}
          sortCol={sortCol}
          sortDir={sortDir}
          selected={selected}
          editorPicks={editorPicks}
          campaignWinners={campaignWinners}
          cpcCampaignMap={cpcCampaignMap}
          activeABTests={activeABTests}
          onSort={handleSort}
          onToggleSelected={toggleSelected}
          sortArrow={sortArrow}
          InfoTip={InfoTip}
        />

        {/* Mobile Cards */}
        <div key={`mobile-${activeFilter}-${searchQuery}`} className={`md:hidden space-y-2 tab-content-enter overflow-x-hidden ${selected.size >= 2 ? 'pb-20' : ''}`}>
          {/* Selection hint — shown until first selection */}
          {selected.size === 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[0.62rem] text-slate-600">
              <svg className="w-3 h-3 text-slate-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Tap ○ to select 2–4 for side-by-side comparison
            </div>
          )}
          {sortedRows.slice(0, mobileVisibleCount).map(row => {
            const broker = row.broker;
            const mobileColumns = showAllMobileColumns ? schema.columns : schema.columns.slice(0, 4);
            return (
            <article key={broker.id} data-testid="compare-mobile-card" className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selected.has(broker.slug)}
                  disabled={!selected.has(broker.slug) && selected.size >= 4}
                  onChange={() => toggleSelected(broker.slug)}
                  className="mt-1 h-5 w-5 accent-slate-900"
                  aria-label={`Pin ${broker.name} to shortlist`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <Link href={`/broker/${broker.slug}`} className="font-bold text-slate-900 truncate">{broker.name}</Link>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[0.62rem] font-bold uppercase text-slate-500">{row.commercialDisclosure}</span>
                  </div>
                  {editorPicks[broker.slug] && !isSponsored(broker) && <p className="text-[0.68rem] font-semibold text-emerald-700">{editorPicks[broker.slug]}</p>}
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {mobileColumns.map((column) => (
                  <div key={column.key} className="rounded-xl bg-slate-50 p-2">
                    <p className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                      {column.label}
                      {column.tooltip ? <InfoTip text={column.tooltip} /> : null}
                    </p>
                    <p className="text-sm font-semibold text-slate-800">
                      {column.key === "estimatedAnnualCost" && row.hasCostInputs ? (
                        <AnimatedNumber
                          value={row.estimatedAnnualCost}
                          format={(n) => `$${Math.round(n).toLocaleString("en-AU")}/yr`}
                        />
                      ) : (
                        column.value(broker, row)
                      )}
                    </p>
                  </div>
                ))}
              </div>
              <details className="mt-3 rounded-xl border border-slate-100 bg-white p-2 text-xs text-slate-600">
                <summary className="cursor-pointer font-bold text-slate-800">Why this result?</summary>
                <ul className="mt-2 list-disc pl-4 space-y-1">
                  {row.why.map((why) => <li key={why}>{why}</li>)}
                </ul>
              </details>
            </article>
            );
          })}
          {sortedRows.length > mobileVisibleCount && (
            <button
              type="button"
              onClick={() => setMobilePaging((p) => ({ ...p, count: p.count + MOBILE_PAGE_STEP }))}
              className="w-full min-h-12 rounded-2xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            >
              Show more platforms ({sortedRows.length - mobileVisibleCount} remaining)
            </button>
          )}
        </div>
        </div>{/* close scroll ref */}

        <CompareFooter
          sorted={sorted}
          brokers={brokers}
          activeFilter={activeFilter}
        />

        <CompareSelectionBar
          brokers={brokers}
          selected={selected}
          showMobileCompare={showMobileCompare}
          onToggleMobileCompare={() => setShowMobileCompare(prev => !prev)}
          onToggleSelected={toggleSelected}
          onClearAll={() => setSelected(new Set())}
        />



        {selected.size > 0 && (
          <aside className="fixed right-4 top-24 z-30 hidden w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl lg:block" aria-label="Pinned provider shortlist drawer">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Shortlist</p>
                <h2 className="text-lg font-extrabold text-slate-900">Pinned providers ({selected.size}/4)</h2>
              </div>
              <button onClick={() => setSelected(new Set())} className="text-xs font-semibold text-slate-500 hover:text-slate-700">Clear</button>
            </div>
            {selected.size < 2 && <p className="mb-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">Pin at least 2 providers for a side-by-side shortlist.</p>}
            <div className="space-y-2">
              {Array.from(selected).map((slug) => {
                const row = sortedRows.find((item) => item.broker.slug === slug) ?? rankBrokers(brokers.filter((item) => item.slug === slug), scenario, costInputs)[0];
                if (!row) return null;
                return (
                  <div key={slug} className="rounded-xl border border-slate-100 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-slate-900">{row.broker.name}</p>
                        <p className="text-xs text-slate-500">{row.hasCostInputs ? `Annual cost: $${row.estimatedAnnualCost.toLocaleString('en-AU')}` : "Fee data incomplete"}</p>
                      </div>
                      <button onClick={() => toggleSelected(slug)} className="text-xs font-bold text-red-500">Remove</button>
                    </div>
                    <p className="mt-2 text-xs text-slate-600">{row.why[0]}</p>
                  </div>
                );
              })}
            </div>
          </aside>
        )}

        {sorted.length === 0 && (
          <EmptyState
            title={searchQuery ? `No platforms match "${searchQuery}"` : "No platforms match this filter"}
            body={searchQuery ? undefined : "Try a different platform category or remove some filters."}
            suggestions={[
              ...(searchQuery ? [{ label: "Clear search", onClick: () => { setSearchQuery(""); } }] : []),
              ...(activeFilter !== 'all' || activeFeatures.size > 0 || maxFee < 999 || minRating > 0 ? [{ label: "Show all platforms", onClick: () => { setActiveFilter('all'); setActiveFeatures(new Set()); setMaxFee(999); setMinRating(0); setSearchQuery(''); } }] : []),
            ]}
            className="my-4"
          />
        )}

        {/* Fee-impact visualiser — educational section shown after main results */}
        {sorted.length > 0 && (
          <div className="mt-6">
            <FeeImpactVisualiser />
          </div>
        )}

        {/* Advisor cross-sell — catch users who are comparison-fatigued */}
        {sorted.length > 0 && (
          <div className="mt-6 bg-violet-50 border border-violet-200 rounded-xl p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex-1">
              <p className="text-sm font-bold text-violet-900 mb-0.5">Not sure which to pick?</p>
              <p className="text-xs text-violet-700">A verified professional can help you make the right choice — free, no obligation.</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Link href="/find-advisor" className="px-4 py-2.5 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700 transition-colors">
                Find an Advisor
              </Link>
              <Link href="/advisors/mortgage-brokers" className="px-4 py-2.5 border border-violet-300 text-violet-700 text-xs font-semibold rounded-lg hover:bg-violet-100 transition-colors">
                Mortgage Brokers
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
