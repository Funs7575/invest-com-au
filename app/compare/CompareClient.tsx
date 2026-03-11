"use client";

import { useState, useMemo, useEffect, useRef } from "react";
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
import BrokerCard from "@/components/BrokerCard";
import SocialProofCounter from "@/components/SocialProofCounter";
import { FeesFreshnessIndicator } from "@/components/FeesFreshnessIndicator";
import { getMostRecentFeeCheck } from "@/lib/utils";
import Icon from "@/components/Icon";
import BottomSheet from "@/components/BottomSheet";
import { getSponsorSortPriority, isSponsored, getPlacementWinners, type PlacementWinner } from "@/lib/sponsorship";

import CompareDesktopTable from "./_components/CompareDesktopTable";
import CompareSelectionBar from "./_components/CompareSelectionBar";
import CompareFooter from "./_components/CompareFooter";

type PlatformType = 'all' | 'shares' | 'crypto' | 'super' | 'robo' | 'savings' | 'term-deposits' | 'property' | 'cfd' | 'research';
type FeatureFilter = 'chess' | 'free' | 'smsf' | 'low-fx' | 'us' | 'has-deal';
type SortCol = 'name' | 'asx_fee_value' | 'us_fee_value' | 'fx_rate' | 'rating';

/* ─── Vertical-specific column/sort config ─── */
const VERTICAL_CONFIG: Record<PlatformType, {
  sortOptions: { col: SortCol; label: string }[];
  featureLabel: string; // replaces "ASX Fee" in mobile cards etc.
  featureFilters: FeatureFilter[];
  description: string;
}> = {
  all: {
    sortOptions: [{ col: 'rating', label: 'Rating' }, { col: 'asx_fee_value', label: 'ASX Fee' }, { col: 'us_fee_value', label: 'US Fee' }, { col: 'fx_rate', label: 'FX Rate' }, { col: 'name', label: 'Name' }],
    featureLabel: 'ASX Fee',
    featureFilters: ['chess', 'free', 'smsf', 'low-fx', 'us', 'has-deal'],
    description: 'Compare fees, features & safety across Australian investing platforms.',
  },
  shares: {
    sortOptions: [{ col: 'rating', label: 'Rating' }, { col: 'asx_fee_value', label: 'Brokerage' }, { col: 'us_fee_value', label: 'US Fee' }, { col: 'fx_rate', label: 'FX Rate' }, { col: 'name', label: 'Name' }],
    featureLabel: 'Brokerage',
    featureFilters: ['chess', 'free', 'smsf', 'low-fx', 'us', 'has-deal'],
    description: 'Compare brokerage fees, CHESS sponsorship, market access & features.',
  },
  crypto: {
    sortOptions: [{ col: 'rating', label: 'Rating' }, { col: 'asx_fee_value', label: 'Trading Fee' }, { col: 'name', label: 'Name' }],
    featureLabel: 'Trading Fee',
    featureFilters: ['has-deal'],
    description: 'Compare spreads, AUD deposits, staking, custody & coin coverage.',
  },
  super: {
    sortOptions: [{ col: 'rating', label: 'Rating' }, { col: 'asx_fee_value', label: 'Admin Fee' }, { col: 'name', label: 'Name' }],
    featureLabel: 'Admin Fee',
    featureFilters: ['has-deal'],
    description: 'Compare admin fees, investment options, insurance & fund performance.',
  },
  robo: {
    sortOptions: [{ col: 'rating', label: 'Rating' }, { col: 'asx_fee_value', label: 'Mgmt Fee' }, { col: 'name', label: 'Name' }],
    featureLabel: 'Mgmt Fee',
    featureFilters: ['has-deal'],
    description: 'Compare management fees, portfolios, minimums & automation features.',
  },
  savings: {
    sortOptions: [{ col: 'rating', label: 'Rating' }, { col: 'name', label: 'Name' }],
    featureLabel: 'Interest Rate',
    featureFilters: ['has-deal'],
    description: 'Compare interest rates, bonus conditions & access for savings accounts.',
  },
  'term-deposits': {
    sortOptions: [{ col: 'rating', label: 'Rating' }, { col: 'name', label: 'Name' }],
    featureLabel: 'Rate',
    featureFilters: ['has-deal'],
    description: 'Compare term deposit rates, terms, minimum deposits & institutions.',
  },
  property: {
    sortOptions: [{ col: 'rating', label: 'Rating' }, { col: 'asx_fee_value', label: 'Min Investment' }, { col: 'name', label: 'Name' }],
    featureLabel: 'Min Investment',
    featureFilters: ['has-deal'],
    description: 'Compare property investment platforms, minimum investment & returns.',
  },
  cfd: {
    sortOptions: [{ col: 'rating', label: 'Rating' }, { col: 'asx_fee_value', label: 'Commission' }, { col: 'fx_rate', label: 'Spread' }, { col: 'name', label: 'Name' }],
    featureLabel: 'Commission',
    featureFilters: ['has-deal'],
    description: 'Compare CFD/forex spreads, commissions, leverage & regulation.',
  },
  research: {
    sortOptions: [{ col: 'rating', label: 'Rating' }, { col: 'asx_fee_value', label: 'Price' }, { col: 'name', label: 'Name' }],
    featureLabel: 'Price',
    featureFilters: ['has-deal'],
    description: 'Compare charting, screeners, alerts, portfolio tools & pricing.',
  },
};

const platformTypes: { key: PlatformType; label: string; short?: string }[] = [
  { key: 'all', label: 'All Platforms' },
  { key: 'shares', label: 'Share Trading', short: 'Brokerages' },
  { key: 'crypto', label: 'Crypto Exchanges' },
  { key: 'super', label: 'Super Funds' },
  { key: 'robo', label: 'Robo-Advisors' },
  { key: 'savings', label: 'Savings Accounts' },
  { key: 'term-deposits', label: 'Term Deposits' },
  { key: 'property', label: 'Property' },
  { key: 'cfd', label: 'CFD & Forex' },
  { key: 'research', label: 'Research Tools' },
];

const featureFilters: { key: FeatureFilter; label: string; icon: string }[] = [
  { key: 'chess', label: 'CHESS Sponsored', icon: 'shield' },
  { key: 'free', label: '$0 Trades', icon: 'zap' },
  { key: 'us', label: 'US Shares', icon: 'globe' },
  { key: 'smsf', label: 'SMSF Support', icon: 'building' },
  { key: 'low-fx', label: 'Low FX (<0.5%)', icon: 'dollar-sign' },
  { key: 'has-deal', label: 'Has Deal', icon: 'tag' },
];

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

// Keep old filter type for URL backwards compatibility
type FilterType = PlatformType | FeatureFilter | 'beginner' | 'all';
const filters = platformTypes; // for URL compat

/** Map URL ?category= values to platform type keys */
const CATEGORY_TO_FILTER: Record<string, PlatformType> = {
  shares: 'shares',
  crypto: 'crypto',
  'robo-advisors': 'robo',
  'research-tools': 'research',
  'super-funds': 'super',
  'property': 'property',
  'cfd-forex': 'cfd',
};

const feeTooltips: Record<string, string> = {
  asx_fee_value: "The fee your platform charges each time you buy or sell Australian shares.",
  us_fee_value: "The fee to buy or sell US shares — like Apple, Tesla, or US ETFs.",
  fx_rate: "The currency conversion markup when you buy shares in a foreign currency. Lower is better.",
  chess: "Shares registered in your name on the ASX register — not held by your platform. Safer if the platform goes bust.",
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
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 bg-slate-800 text-white text-xs rounded-lg z-10 max-w-[220px] whitespace-normal text-center leading-tight shadow-lg" role="tooltip">
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
  const initialFilter: PlatformType = (() => {
    if (urlFilter && platformTypes.some(fl => fl.key === urlFilter)) return urlFilter as PlatformType;
    if (urlCategory && CATEGORY_TO_FILTER[urlCategory]) return CATEGORY_TO_FILTER[urlCategory];
    return 'all';
  })();
  const urlQuery = searchParams.get("q") || "";

  const [searchQuery, setSearchQuery] = useState(urlQuery);
  const [activeFilter, setActiveFilter] = useState<PlatformType>(initialFilter);
  const [activeFeatures, setActiveFeatures] = useState<Set<FeatureFilter>>(new Set());
  const [maxFee, setMaxFee] = useState(999);
  const [minRating, setMinRating] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [sortCol, setSortCol] = useState<SortCol>('rating');
  const [sortDir, setSortDir] = useState<1 | -1>(-1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showMobileCompare, setShowMobileCompare] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Sync URL when filter changes (for sharing/bookmarking)
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
    window.history.replaceState({}, '', url.toString());
  }, [activeFilter, searchQuery]);

  // Marketplace campaign allocation
  const [campaignWinners, setCampaignWinners] = useState<PlacementWinner[]>([]);
  const [cpcCampaigns, setCpcCampaigns] = useState<PlacementWinner[]>([]);

  useEffect(() => {
    // Fetch featured placement winners
    getPlacementWinners("compare-top").then(setCampaignWinners);
    // Fetch CPC campaigns for click attribution
    getPlacementWinners("compare-cpc").then(setCpcCampaigns);
  }, []);

  // Build a map of broker_slug → campaign_id for CPC attribution
  const cpcCampaignMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const w of cpcCampaigns) {
      if (!map.has(w.broker_slug)) map.set(w.broker_slug, w.campaign_id);
    }
    return map;
  }, [cpcCampaigns]);

  function toggleSelected(slug: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        if (next.size >= 4) return prev; // cap at 4
        next.add(slug);
        trackEvent('compare_select', { broker: slug }, '/compare');
      }
      return next;
    });
  }

  // Sync filter/query when URL params change (e.g. browser back/forward)
  useEffect(() => {
    const q = searchParams.get("q") || "";
    setSearchQuery(q);
    const f = searchParams.get("filter");
    const c = searchParams.get("category");
    if (f && platformTypes.some(fl => fl.key === f)) {
      setActiveFilter(f as PlatformType);
    } else if (c && CATEGORY_TO_FILTER[c]) {
      setActiveFilter(CATEGORY_TO_FILTER[c]);
    } else if (!f && !c) {
      setActiveFilter('all');
    }
  }, [searchParams]);

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

  const filtered = useMemo(() => {
    let list = [...brokers];
    
    // 1. Platform type filter (single-select)
    switch (activeFilter) {
      case 'shares': list = list.filter(b => (b.platform_type || 'share_broker') === 'share_broker'); break;
      case 'crypto': list = list.filter(b => b.is_crypto); break;
      case 'robo': list = list.filter(b => b.platform_type === 'robo_advisor'); break;
      case 'research': list = list.filter(b => b.platform_type === 'research_tool'); break;
      case 'super': list = list.filter(b => b.platform_type === 'super_fund'); break;
      case 'property': list = list.filter(b => b.platform_type === 'property_platform'); break;
      case 'cfd': list = list.filter(b => b.platform_type === 'cfd_forex'); break;
      case 'savings': list = list.filter(b => b.platform_type === 'savings_account'); break;
      case 'term-deposits': list = list.filter(b => b.platform_type === 'term_deposit'); break;
    }
    
    // 2. Feature filters (multi-select — all must match)
    if (activeFeatures.has('chess')) list = list.filter(b => b.chess_sponsored);
    if (activeFeatures.has('free')) list = list.filter(b => (b.asx_fee_value === 0) || (b.us_fee_value === 0));
    if (activeFeatures.has('us')) list = list.filter(b => b.us_fee_value != null && b.us_fee_value <= 5);
    if (activeFeatures.has('smsf')) list = list.filter(b => b.smsf_support);
    if (activeFeatures.has('low-fx')) list = list.filter(b => b.fx_rate != null && b.fx_rate > 0 && b.fx_rate < 0.5);
    if (activeFeatures.has('has-deal')) list = list.filter(b => b.deal && b.deal_text);
    
    // 3. Fee range filter
    if (maxFee < 999) {
      list = list.filter(b => (b.asx_fee_value ?? 999) <= maxFee);
    }
    
    // 4. Rating filter
    if (minRating > 0) {
      list = list.filter(b => (b.rating ?? 0) >= minRating);
    }
    
    // 5. Text search filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(b =>
        b.name.toLowerCase().includes(q) ||
        (b.tagline && b.tagline.toLowerCase().includes(q)) ||
        b.slug.toLowerCase().includes(q)
      );
    }
    return list;
  }, [brokers, activeFilter, activeFeatures, maxFee, minRating, searchQuery]);

  const sorted = useMemo(() => {
    // Campaign winners from marketplace get priority over sponsorship tiers
    const campaignWinnerSlugs = new Set(campaignWinners.map(w => w.broker_slug));

    const baseSorted = [...filtered].sort((a, b) => {
      // Campaign winners get top priority (position 0)
      const aIsCampaignWinner = campaignWinnerSlugs.has(a.slug) ? 0 : 1;
      const bIsCampaignWinner = campaignWinnerSlugs.has(b.slug) ? 0 : 1;
      if (aIsCampaignWinner !== bIsCampaignWinner) return aIsCampaignWinner - bIsCampaignWinner;

      // Then sponsored brokers
      const aPriority = getSponsorSortPriority(a.sponsorship_tier);
      const bPriority = getSponsorSortPriority(b.sponsorship_tier);
      if (aPriority !== bPriority) return aPriority - bPriority;

      // Then apply user's selected sort
      const av = a[sortCol] ?? 999;
      const bv = b[sortCol] ?? 999;
      if (typeof av === 'string' && typeof bv === 'string') {
        return av.toLowerCase() < bv.toLowerCase() ? -sortDir : sortDir;
      }
      return ((av as number) - (bv as number)) * sortDir;
    });

    return baseSorted;
  }, [filtered, sortCol, sortDir, campaignWinners]);

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

        {/* Desktop Filter System */}
        <div className="hidden md:block mb-4 space-y-3">
          {/* Row 1: Platform type pills */}
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Platform type">
            {platformTypes.map(f => (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                role="tab"
                aria-selected={activeFilter === f.key}
                className={`shrink-0 px-4 py-2 text-sm font-medium rounded-full transition-all ${
                  activeFilter === f.key
                    ? 'bg-blue-700 text-white shadow-sm scale-105'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:scale-[1.02]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          
          {/* Row 2: Feature toggles + Advanced filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {featureFilters.map(f => (
              <button
                key={f.key}
                onClick={() => setActiveFeatures(prev => {
                  const next = new Set(prev);
                  if (next.has(f.key)) next.delete(f.key); else next.add(f.key);
                  return next;
                })}
                className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 ${
                  activeFeatures.has(f.key)
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
                }`}
              >
                <Icon name={f.icon} size={12} />
                {f.label}
              </button>
            ))}
            
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
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 min-h-[44px] bg-slate-100 text-slate-700 text-xs font-semibold rounded-full hover:bg-slate-200 transition-colors shrink-0"
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
              className="w-full px-3 py-2.5 pl-8 min-h-[44px] border border-slate-200 rounded-full text-xs focus:outline-none focus:border-slate-400"
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
                {(VERTICAL_CONFIG[activeFilter as PlatformType] || VERTICAL_CONFIG.all).sortOptions.map(s => (
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
                    className={`px-3 py-2 text-sm font-medium rounded-full ${
                      activeFilter === f.key
                        ? 'bg-blue-700 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {f.short || f.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Features */}
            <div className="mb-4">
              <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-400 mb-2">Features</p>
              <div className="flex flex-wrap gap-2">
                {featureFilters.map(f => (
                  <button
                    key={f.key}
                    onClick={() => setActiveFeatures(prev => {
                      const next = new Set(prev);
                      if (next.has(f.key)) next.delete(f.key); else next.add(f.key);
                      return next;
                    })}
                    className={`px-3 py-2 text-sm font-medium rounded-full ${
                      activeFeatures.has(f.key)
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Fee & Rating */}
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div>
                <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-400 mb-2">Max ASX Fee</p>
                <select value={maxFee} onChange={e => setMaxFee(Number(e.target.value))} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm">
                  {maxFeeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-400 mb-2">Min Rating</p>
                <select value={minRating} onChange={e => setMinRating(Number(e.target.value))} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm">
                  {minRatingOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2 border-t border-slate-100">
              <button
                onClick={() => { setActiveFilter('all'); setActiveFeatures(new Set()); setMaxFee(999); setMinRating(0); }}
                className="flex-1 py-3 min-h-[48px] text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Clear All
              </button>
              <button
                onClick={() => setSheetOpen(false)}
                className="flex-1 py-3 min-h-[48px] text-sm font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors"
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

        {/* Desktop Table */}
        <div ref={resultsRef} className="scroll-mt-16">
        <CompareDesktopTable
          sorted={sorted}
          activeFilter={activeFilter}
          searchQuery={searchQuery}
          sortCol={sortCol}
          sortDir={sortDir}
          selected={selected}
          editorPicks={editorPicks}
          campaignWinners={campaignWinners}
          cpcCampaignMap={cpcCampaignMap}
          onSort={handleSort}
          onToggleSelected={toggleSelected}
          sortArrow={sortArrow}
          InfoTip={InfoTip}
          feeTooltips={feeTooltips}
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
          {sorted.map(broker => (
            <BrokerCard
              key={broker.id}
              broker={broker}
              badge={isSponsored(broker) ? undefined : editorPicks[broker.slug]}
              context="compare"
              isSelected={selected.has(broker.slug)}
              onToggleSelect={toggleSelected}
              selectionDisabled={!selected.has(broker.slug) && selected.size >= 4}
            />
          ))}
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
      </div>
    </div>
  );
}
