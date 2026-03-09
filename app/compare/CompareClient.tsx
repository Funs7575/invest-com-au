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

type FilterType = 'all' | 'shares' | 'beginner' | 'chess' | 'free' | 'us' | 'smsf' | 'low-fx' | 'crypto' | 'robo' | 'research' | 'super' | 'property' | 'cfd' | 'savings' | 'term-deposits' | 'has-deal';
type SortCol = 'name' | 'asx_fee_value' | 'us_fee_value' | 'fx_rate' | 'rating';

const filters: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All Platforms' },
  { key: 'shares', label: 'Share Trading' },
  { key: 'crypto', label: 'Crypto' },
  { key: 'super', label: 'Super Funds' },
  { key: 'robo', label: 'Robo-Advisors' },
  { key: 'savings', label: 'Savings' },
  { key: 'term-deposits', label: 'Term Deposits' },
  { key: 'property', label: 'Property' },
  { key: 'cfd', label: 'CFD & Forex' },
  { key: 'research', label: 'Research Tools' },
  { key: 'beginner', label: 'Beginner' },
  { key: 'chess', label: 'CHESS Only' },
  { key: 'free', label: '$0 Trades' },
  { key: 'us', label: 'US Shares' },
  { key: 'smsf', label: 'SMSF' },
  { key: 'low-fx', label: 'Low FX' },
  { key: 'has-deal', label: 'Has Deal' },
];

/** Map URL ?category= values to filter keys */
const CATEGORY_TO_FILTER: Record<string, FilterType> = {
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
  const initialFilter: FilterType = (() => {
    if (urlFilter && filters.some(fl => fl.key === urlFilter)) return urlFilter as FilterType;
    if (urlCategory && CATEGORY_TO_FILTER[urlCategory]) return CATEGORY_TO_FILTER[urlCategory];
    return 'all';
  })();
  const urlQuery = searchParams.get("q") || "";

  const [searchQuery, setSearchQuery] = useState(urlQuery);
  const [activeFilter, setActiveFilter] = useState<FilterType>(initialFilter);
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
    if (f && filters.some(fl => fl.key === f)) {
      setActiveFilter(f as FilterType);
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
    switch (activeFilter) {
      case 'shares': list = list.filter(b => (b.platform_type || 'share_broker') === 'share_broker'); break;
      case 'beginner': list = list.filter(b => !b.is_crypto && (b.asx_fee_value ?? 999) <= 10 && (b.rating ?? 0) >= 4.0); break;
      case 'chess': list = list.filter(b => b.chess_sponsored); break;
      case 'free': list = list.filter(b => (b.asx_fee_value === 0) || (b.us_fee_value === 0)); break;
      case 'us': list = list.filter(b => b.us_fee_value != null && b.us_fee_value <= 5); break;
      case 'smsf': list = list.filter(b => b.smsf_support); break;
      case 'low-fx': list = list.filter(b => b.fx_rate != null && b.fx_rate > 0 && b.fx_rate < 0.5); break;
      case 'crypto': list = list.filter(b => b.is_crypto); break;
      case 'robo': list = list.filter(b => b.platform_type === 'robo_advisor'); break;
      case 'research': list = list.filter(b => b.platform_type === 'research_tool'); break;
      case 'super': list = list.filter(b => b.platform_type === 'super_fund'); break;
      case 'property': list = list.filter(b => b.platform_type === 'property_platform'); break;
      case 'cfd': list = list.filter(b => b.platform_type === 'cfd_forex'); break;
      case 'savings': list = list.filter(b => b.platform_type === 'savings_account'); break;
      case 'term-deposits': list = list.filter(b => b.platform_type === 'term_deposit'); break;
      case 'has-deal': list = list.filter(b => b.deal && b.deal_text); break;
      // 'all' — no filtering, show everything
    }
    // Text search filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(b =>
        b.name.toLowerCase().includes(q) ||
        (b.tagline && b.tagline.toLowerCase().includes(q)) ||
        b.slug.toLowerCase().includes(q)
      );
    }
    return list;
  }, [brokers, activeFilter, searchQuery]);

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

        {/* Desktop Filter Pills */}
        <div className="hidden md:flex md:flex-wrap gap-2 mb-4" role="tablist" aria-label="Platform filter">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              role="tab"
              aria-selected={activeFilter === f.key}
              className={`shrink-0 px-4 py-2 text-sm font-medium rounded-full filter-pill ${
                activeFilter === f.key
                  ? 'bg-blue-700 text-white shadow-sm scale-105'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:scale-[1.02]'
              }`}
            >
              {f.label}
            </button>
          ))}
          {(activeFilter !== 'all' || searchQuery.trim()) && (
            <button
              onClick={() => { setActiveFilter('all'); setSearchQuery(''); }}
              className="shrink-0 px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors flex items-center gap-1"
            >
              <XIcon className="w-3.5 h-3.5" />
              Clear filters
            </button>
          )}
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
            {activeFilter !== 'all' ? filters.find(f => f.key === activeFilter)?.label : 'Filter & Sort'}
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
                {([
                  { col: 'rating' as SortCol, label: 'Rating' },
                  { col: 'asx_fee_value' as SortCol, label: 'ASX Fee' },
                  { col: 'us_fee_value' as SortCol, label: 'US Fee' },
                  { col: 'fx_rate' as SortCol, label: 'FX Rate' },
                  { col: 'name' as SortCol, label: 'Name' },
                ] as { col: SortCol; label: string }[]).map(s => (
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
            {/* Filters */}
            <div className="mb-4">
              <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-400 mb-2">Filter</p>
              <div className="flex flex-wrap gap-2">
              {filters.map(f => (
                <button
                  key={f.key}
                  onClick={() => setActiveFilter(f.key)}
                  className={`px-4 py-2.5 text-sm font-medium rounded-full filter-pill ${
                    activeFilter === f.key
                      ? 'bg-blue-700 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2 border-t border-slate-100">
              <button
                onClick={() => { setActiveFilter('all'); }}
                className="flex-1 py-3 min-h-[48px] text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Clear All
              </button>
              <button
                onClick={() => setSheetOpen(false)}
                className="flex-1 py-3 min-h-[48px] text-sm font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors"
              >
                Apply
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
