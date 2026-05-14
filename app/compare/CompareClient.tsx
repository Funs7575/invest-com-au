"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
/* Inline SVG icons to avoid lucide-react dependency */
const Search = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
);
const XIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);
import type { Broker } from "@/lib/types";
import { trackEvent, getAffiliateLink, trackClick, AFFILIATE_REL } from "@/lib/tracking";
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
import type { ABTestConfig } from "@/lib/ab-test";
import { createClient } from "@/lib/supabase/client";
import {
  CATEGORY_ALIASES,
  CATEGORY_SCHEMAS,
  DEFAULT_COST_INPUTS,
  SCENARIOS,
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

const platformTypes: { key: CompareCategory; label: string; short?: string }[] = Object.values(CATEGORY_SCHEMAS).map((schema) => ({
  key: schema.key,
  label: schema.label,
  short: schema.shortLabel,
}));

const filters = platformTypes; // for URL compat

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
    : 'rating';
  const urlSortDir = searchParams.get("dir");
  const initialSortDir: 1 | -1 = urlSortDir === 'asc' ? 1 : -1;

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
  const resultsRef = useRef<HTMLDivElement>(null);
  const initialSortColForQuiz: SortCol =
    urlQuizPriority === "fees" ? "asx_fee_value" : initialSortCol;
  const initialSortDirForQuiz: 1 | -1 = urlQuizPriority === "fees" ? 1 : initialSortDir;
  const [sortCol, setSortCol] = useState<SortCol>(initialSortColForQuiz);
  const [sortDir, setSortDir] = useState<1 | -1>(initialSortDirForQuiz);
  const [selected, setSelected] = useState<Set<string>>(initialSelected);
  const [showMobileCompare, setShowMobileCompare] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [scenario, setScenario] = useState<ScenarioMode | "none">((searchParams.get("scenario") as ScenarioMode) || "none");
  const [costInputs, setCostInputs] = useState<CostInputs>(DEFAULT_COST_INPUTS);

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
    if (sortCol === 'rating') {
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

  const effectiveCategory = scenarioCategory(scenario, activeFilter);
  const schema = CATEGORY_SCHEMAS[effectiveCategory];
  const filtered = useMemo(() => filterBrokers(brokers, {
    category: activeFilter,
    features: activeFeatures,
    maxFee,
    minRating,
    searchQuery,
    scenario,
  }), [brokers, activeFilter, activeFeatures, maxFee, minRating, searchQuery, scenario]);

  const ranked = useMemo(() => rankBrokers(filtered, scenario, costInputs), [filtered, scenario, costInputs]);

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

  // Compute editor picks
  const editorPicks = useMemo(() => {
    const picks: Record<string, string> = {};
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
            className="rounded-full border-2 border-white bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 shadow-sm"
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
        <nav className="text-xs md:text-sm text-slate-500 mb-2 md:mb-4">
          <Link href="/" className="hover:text-slate-900">Home</Link>
          <span className="mx-1.5 md:mx-2">/</span>
          <span className="text-slate-700">Compare Platforms</span>
        </nav>

        {/* Header */}
        <div className="bg-gradient-to-r from-slate-50 to-white border border-slate-200 rounded-2xl p-4 md:p-6 mb-3 md:mb-6">
          <div className="flex items-start justify-between gap-2 mb-1 md:mb-2">
            <h1 className="text-xl md:text-4xl font-extrabold text-slate-900">Compare Platforms</h1>
            <span className="hidden md:inline">
              <FeesFreshnessIndicator lastChecked={getMostRecentFeeCheck(brokers)} variant="inline" />
            </span>
          </div>
          <p className="text-xs md:text-base text-slate-500 mb-1.5 md:mb-2">
            <span className="hidden md:inline">Side-by-side comparison of fees, features, and safety across {brokers.length}+ Australian platforms.</span>
            <span className="md:hidden">Fees, features &amp; safety side-by-side.</span>
            <span className="md:hidden ml-1"><FeesFreshnessIndicator lastChecked={getMostRecentFeeCheck(brokers)} variant="inline" /></span>
          </p>
          <div className="flex items-center gap-3 text-[0.62rem] md:text-xs text-slate-400">
            <SocialProofCounter />
            <span>·</span>
            <Link href="/methodology" className="underline hover:text-slate-600">Methodology</Link>
            <span>·</span>
            <button
              onClick={() => {
                const url = typeof window !== 'undefined' ? window.location.href : '';
                if (navigator.share) {
                  navigator.share({ title: 'Compare Platforms — invest.com.au', url }).catch(() => {});
                } else {
                  navigator.clipboard.writeText(url).then(() => alert('Link copied!')).catch(() => {});
                }
              }}
              className="underline hover:text-slate-600"
            >
              Share this view
            </button>
            <span>·</span>
            <Link href="/how-we-earn" className="underline hover:text-slate-600">How we earn</Link>
          </div>
        </div>

        {/* Deal of the Month — compact on mobile */}
        {(() => {
          const dealBroker = brokers.find(b => b.deal && b.deal_text);
          if (!dealBroker) return null;
          return (
            <div className="mb-3 md:mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-lg md:rounded-xl px-3 py-2 md:p-4 flex items-center justify-between gap-2 md:gap-3">
              <div className="flex items-center gap-2 md:gap-3 min-w-0">
                <Icon name="flame" size={16} className="text-amber-500 shrink-0 md:hidden" />
                <Icon name="flame" size={24} className="text-amber-500 shrink-0 hidden md:block" />
                <div className="min-w-0">
                  <p className="text-[0.69rem] md:text-sm text-slate-700 leading-snug">
                    <strong>{dealBroker.name}</strong>
                    <span className="hidden md:inline"> — {dealBroker.deal_text}</span>
                    <span className="md:hidden text-slate-500"> — {dealBroker.deal_text}</span>
                  </p>
                </div>
              </div>
              <a
                href={getAffiliateLink(dealBroker)}
                target="_blank"
                rel={AFFILIATE_REL}
                onClick={() => trackClick(dealBroker.slug, dealBroker.name, 'compare-deal-banner', '/compare', 'compare')}
                className="shrink-0 px-3 md:px-4 py-1.5 md:py-2 bg-amber-600 text-white text-xs md:text-sm font-bold rounded-lg hover:bg-amber-700 transition-colors"
              >
                Claim →
              </a>
            </div>
          );
        })()}

        <section className="mb-4 grid gap-3 lg:grid-cols-[1.1fr_0.9fr]" aria-label="Scenario and true-cost calculator">
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
                    type="number"
                    min="0"
                    value={costInputs[key as keyof CostInputs]}
                    onChange={(e) => setCostInputs((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
                  />
                </label>
              ))}
            </div>
          </div>
        </section>

        {/* Desktop Filter System */}
        <div className="hidden md:block mb-4 space-y-3">
          {/* Row 1: Platform type pills with logos */}
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Platform type">
            {platformTypes.map(f => (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                role="tab"
                aria-selected={activeFilter === f.key}
                className={`shrink-0 px-4 py-2 text-sm font-medium rounded-full transition-all inline-flex items-center gap-0.5 ${
                  activeFilter === f.key
                    ? 'bg-blue-700 text-white shadow-sm scale-105'
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
          
          {/* Row 2: Feature toggles + Advanced filters */}
          <div className="flex items-center gap-2 flex-wrap">
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
                className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 ${
                  activeFeatures.has(key)
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
                }`}
              >
                <Icon name={f.icon} size={12} />
                {f.label}
              </button>
            );})}
            
            <span className="w-px h-5 bg-slate-200 mx-1" />
            
            {/* Max Fee dropdown */}
            <select
              value={maxFee}
              onChange={e => setMaxFee(Number(e.target.value))}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                maxFee < 999
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
            >
              {maxFeeOptions.map(o => (
                <option key={o.value} value={o.value}>ASX Fee: {o.label}</option>
              ))}
            </select>
            
            {/* Min Rating dropdown */}
            <select
              value={minRating}
              onChange={e => setMinRating(Number(e.target.value))}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                minRating > 0
                  ? 'bg-amber-50 border-amber-300 text-amber-700'
                  : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
            >
              {minRatingOptions.map(o => (
                <option key={o.value} value={o.value}>Rating: {o.label}</option>
              ))}
            </select>
            
            {/* Active filter count + clear */}
            {(activeFilter !== 'all' || activeFeatures.size > 0 || maxFee < 999 || minRating > 0 || searchQuery.trim()) && (
              <button
                onClick={() => { setActiveFilter('all'); setActiveFeatures(new Set()); setMaxFee(999); setMinRating(0); setSearchQuery(''); }}
                className="shrink-0 px-3 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1"
              >
                <XIcon className="w-3 h-3" />
                Clear all ({[activeFilter !== 'all' ? 1 : 0, activeFeatures.size, maxFee < 999 ? 1 : 0, minRating > 0 ? 1 : 0].reduce((a, b) => a + b, 0)} filters)
              </button>
            )}
          </div>
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
            {activeFilter !== 'all' ? platformTypes.find(f => f.key === activeFilter)?.label : activeFeatures.size > 0 ? `${activeFeatures.size} filter${activeFeatures.size > 1 ? 's' : ''}` : 'Filter & Sort'}
          </button>
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full px-3 py-2.5 pl-8 min-h-11 border border-slate-200 rounded-full text-xs focus:outline-none focus:border-slate-400"
              aria-label="Search platforms"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" aria-label="Clear">
                <XIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Filter & Sort">
            {/* Sort */}
            <div className="mb-4">
              <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-400 mb-2">Sort by</p>
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
              <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-400 mb-2">Platform type</p>
              <div className="flex flex-wrap gap-2">
                {platformTypes.map(f => (
                  <button
                    key={f.key}
                    onClick={() => setActiveFilter(f.key)}
                    className={`px-3 py-2 text-sm font-medium rounded-full inline-flex items-center gap-0.5 ${
                      activeFilter === f.key
                        ? 'bg-blue-700 text-white shadow-sm'
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
              <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-400 mb-2">Features</p>
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
                <label className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-400 mb-2 block">Max ASX Fee</label>
                <select value={maxFee} onChange={e => setMaxFee(Number(e.target.value))} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm">
                  {maxFeeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-400 mb-2 block">Min Rating</label>
                <select value={minRating} onChange={e => setMinRating(Number(e.target.value))} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm">
                  {minRatingOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
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

        {/* Desktop Search Input */}
        <div className="hidden md:block relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search platforms by name..."
            className="w-80 px-4 py-2.5 pl-10 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700"
            aria-label="Search platforms by name"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute left-[18.5rem] top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label="Clear search"
            >
              <XIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Results count — accessible */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {sorted.length} {sorted.length === 1 ? 'platform' : 'platforms'} found{activeFilter !== 'all' ? ` with ${filters.find(f => f.key === activeFilter)?.label} filter` : ''}{searchQuery ? ` matching "${searchQuery}"` : ''}
        </div>
        {/* Mobile result count — visible */}
        <div className="md:hidden flex items-center justify-between mb-2">
          <span className="text-[0.62rem] text-slate-400">
            {sorted.length} platform{sorted.length !== 1 ? 's' : ''}
            {activeFilter !== 'all' ? ` · ${filters.find(f => f.key === activeFilter)?.label}` : ''}
            {sortCol !== 'rating' ? ` · Sorted by ${sortCol === 'asx_fee_value' ? 'ASX fee' : sortCol === 'us_fee_value' ? 'US fee' : sortCol === 'fx_rate' ? 'FX rate' : sortCol}` : ''}
          </span>
        </div>

        {/* Quiz prompt — hidden on mobile to save space */}
        <div className="hidden md:flex items-center gap-2 mb-4 text-xs text-slate-500">
          <span>Not sure which to pick?</span>
          <Link href="/quiz" className="text-blue-700 font-semibold hover:text-blue-800 transition-colors">
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
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[0.62rem] text-slate-400">
              <svg className="w-3 h-3 text-slate-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Tap ○ to select 2–4 for side-by-side comparison
            </div>
          )}
          {sortedRows.map(row => {
            const broker = row.broker;
            const mobileColumns = schema.columns.slice(0, 4);
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
                    <p className="text-[0.62rem] font-bold uppercase tracking-wide text-slate-400">{column.label}</p>
                    <p className="text-sm font-semibold text-slate-800">{column.value(broker, row)}</p>
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
        />



        {selected.size > 0 && (
          <aside className="fixed right-4 top-24 z-30 hidden w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl lg:block" aria-label="Pinned provider shortlist drawer">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Shortlist</p>
                <h2 className="text-lg font-extrabold text-slate-900">Pinned providers ({selected.size}/4)</h2>
              </div>
              <button onClick={() => setSelected(new Set())} className="text-xs font-semibold text-slate-400 hover:text-slate-700">Clear</button>
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
                        <p className="text-xs text-slate-500">Annual cost: ${row.estimatedAnnualCost.toLocaleString('en-AU')}</p>
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
          <div className="text-center py-8 md:py-12 text-slate-500" role="status">
            {searchQuery ? (
              <>
                <p className="text-sm md:text-lg font-medium mb-1.5">No platforms match &ldquo;{searchQuery}&rdquo;</p>
                <button
                  onClick={() => { setSearchQuery(""); setActiveFilter('all'); }}
                  className="text-blue-700 text-sm font-semibold hover:text-blue-800 transition-colors"
                >
                  Clear all filters
                </button>
              </>
            ) : (
              <>
                <p className="text-sm mb-2">No platforms match this filter. Try a different category.</p>
                <button
                  onClick={() => setActiveFilter('all')}
                  className="text-blue-700 text-sm font-semibold hover:text-blue-800 transition-colors"
                >
                  Show all platforms
                </button>
              </>
            )}
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
