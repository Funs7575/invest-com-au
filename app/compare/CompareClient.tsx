"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, X } from "lucide-react";
import type { Broker } from "@/lib/types";
import { trackClick, trackEvent, getAffiliateLink, getBenefitCta, renderStars, AFFILIATE_REL } from "@/lib/tracking";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import { downloadCSV } from "@/lib/csv-export";
import BrokerCard from "@/components/BrokerCard";
import { FeesFreshnessIndicator } from "@/components/FeesFreshnessIndicator";
import { getMostRecentFeeCheck } from "@/lib/utils";
import ScrollReveal from "@/components/ScrollReveal";
import PromoBadge from "@/components/PromoBadge";
import ProUpsellBanner from "@/components/ProUpsellBanner";
import SponsorBadge from "@/components/SponsorBadge";
import { getSponsorSortPriority, isSponsored, getPlacementWinners, type PlacementWinner } from "@/lib/sponsorship";
import Icon from "@/components/Icon";
import BottomSheet from "@/components/BottomSheet";
import ShortlistButton from "@/components/ShortlistButton";
import AdSlot from "@/components/AdSlot";

type FilterType = 'all' | 'beginner' | 'chess' | 'free' | 'us' | 'smsf' | 'low-fx' | 'crypto';
type SortCol = 'name' | 'asx_fee_value' | 'us_fee_value' | 'fx_rate' | 'rating';

const filters: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All Brokers' },
  { key: 'beginner', label: 'Beginner' },
  { key: 'chess', label: 'CHESS Only' },
  { key: 'free', label: '$0 Trades' },
  { key: 'us', label: 'US Shares' },
  { key: 'smsf', label: 'SMSF' },
  { key: 'low-fx', label: 'Low FX' },
  { key: 'crypto', label: 'Crypto' },
];

const feeTooltips: Record<string, string> = {
  asx_fee_value: "The fee your broker charges each time you buy or sell Australian shares.",
  us_fee_value: "The fee to buy or sell US shares — like Apple, Tesla, or US ETFs.",
  fx_rate: "The currency conversion markup when you buy shares in a foreign currency. Lower is better.",
  chess: "Shares registered in your name on the ASX register — not held by your broker. Safer if the broker goes bust.",
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

  // Derive initial filter/query from URL params
  const urlFilter = searchParams.get("filter");
  const initialFilter: FilterType = (urlFilter && filters.some(fl => fl.key === urlFilter))
    ? urlFilter as FilterType : 'all';
  const urlQuery = searchParams.get("q") || "";

  const [searchQuery, setSearchQuery] = useState(urlQuery);
  const [activeFilter, setActiveFilter] = useState<FilterType>(initialFilter);
  const [sortCol, setSortCol] = useState<SortCol>('rating');
  const [sortDir, setSortDir] = useState<1 | -1>(-1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sheetOpen, setSheetOpen] = useState(false);

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
    if (f && filters.some(fl => fl.key === f)) {
      setActiveFilter(f as FilterType);
    } else if (!f) {
      setActiveFilter('all');
    }
  }, [searchParams]);

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
      case 'beginner': list = list.filter(b => !b.is_crypto && (b.asx_fee_value ?? 999) <= 10 && (b.rating ?? 0) >= 4.0); break;
      case 'chess': list = list.filter(b => b.chess_sponsored); break;
      case 'free': list = list.filter(b => (b.asx_fee_value === 0) || (b.us_fee_value === 0)); break;
      case 'us': list = list.filter(b => b.us_fee_value != null && b.us_fee_value <= 5); break;
      case 'smsf': list = list.filter(b => b.smsf_support); break;
      case 'low-fx': list = list.filter(b => b.fx_rate != null && b.fx_rate > 0 && b.fx_rate < 0.5); break;
      case 'crypto': list = list.filter(b => b.is_crypto); break;
      default: list = list.filter(b => !b.is_crypto); break;
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
        {/* Header — compact on mobile */}
        <div className="flex items-start justify-between gap-2 mb-1 md:mb-2">
          <h1 className="text-xl md:text-4xl font-extrabold">Compare Brokers</h1>
          <span className="hidden md:inline">
            <FeesFreshnessIndicator lastChecked={getMostRecentFeeCheck(brokers)} variant="inline" />
          </span>
        </div>
        <p className="text-xs md:text-base text-slate-500 mb-1.5 md:mb-2">
          <span className="hidden md:inline">Side-by-side comparison of fees, features, and safety.{" "}</span>
          <span className="md:hidden">Fees, features &amp; safety side-by-side.</span>
          <span className="md:hidden ml-1"><FeesFreshnessIndicator lastChecked={getMostRecentFeeCheck(brokers)} variant="inline" /></span>
        </p>
        <p className="text-[0.62rem] md:text-xs text-slate-400 mb-3 md:mb-6">
          <Link href="/how-we-verify" className="underline hover:text-slate-600">How we verify</Link>
          {" · "}
          <Link href="/methodology" className="underline hover:text-slate-600">Methodology</Link>
          {" · "}
          <Link href="/how-we-earn" className="underline hover:text-slate-600">How we earn</Link>
        </p>

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
        <div className="hidden md:flex md:flex-wrap gap-2 mb-4" role="tablist" aria-label="Broker filter">
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
              <X className="w-3.5 h-3.5" />
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
            {activeFilter !== 'all' ? filters.find(f => f.key === activeFilter)?.label : 'Filter'}
          </button>
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full px-3 py-2.5 pl-8 min-h-[44px] border border-slate-200 rounded-full text-xs focus:outline-none focus:border-slate-400"
              aria-label="Search brokers"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" aria-label="Clear">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Filter Brokers">
            <div className="flex flex-wrap gap-2 mb-6">
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
            placeholder="Search brokers by name..."
            className="w-80 px-4 py-2.5 pl-10 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700"
            aria-label="Search brokers by name"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute left-[18.5rem] top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Results count — accessible */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {sorted.length} {sorted.length === 1 ? 'broker' : 'brokers'} found{activeFilter !== 'all' ? ` with ${filters.find(f => f.key === activeFilter)?.label} filter` : ''}{searchQuery ? ` matching "${searchQuery}"` : ''}
        </div>

        {/* Quiz prompt — hidden on mobile to save space */}
        <div className="hidden md:flex items-center gap-2 mb-4 text-xs text-slate-500">
          <span>Not sure which to pick?</span>
          <Link href="/quiz" className="text-blue-700 font-semibold hover:text-blue-800 transition-colors">
            Take the 60-sec quiz →
          </Link>
        </div>

        {/* Desktop Table */}
        <div key={`${activeFilter}-${searchQuery}`} className="hidden md:block overflow-x-auto tab-content-enter">
          <ScrollReveal key={`table-${activeFilter}-${searchQuery}-${sortCol}-${sortDir}`} animation="table-row-stagger" as="table" className="w-full border border-slate-200 rounded-lg compare-table">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-3 py-3 w-10"></th>
                <th scope="col" className="px-4 py-3 text-left font-semibold text-sm" aria-sort={sortCol === 'name' ? (sortDir === 1 ? 'ascending' : 'descending') : undefined}>
                  <button onClick={() => handleSort('name')} className="hover:text-slate-900 transition-colors" aria-label="Sort by broker name">
                    Broker{sortArrow('name')}
                  </button>
                </th>
                <th scope="col" className="px-4 py-3 text-left font-semibold text-sm" aria-sort={sortCol === 'asx_fee_value' ? (sortDir === 1 ? 'ascending' : 'descending') : undefined}>
                  <button onClick={() => handleSort('asx_fee_value')} className="hover:text-slate-900 transition-colors" aria-label="Sort by ASX fee">
                    ASX Fee{sortArrow('asx_fee_value')}
                  </button>
                  <InfoTip text={feeTooltips.asx_fee_value} />
                </th>
                <th scope="col" className="px-4 py-3 text-left font-semibold text-sm" aria-sort={sortCol === 'us_fee_value' ? (sortDir === 1 ? 'ascending' : 'descending') : undefined}>
                  <button onClick={() => handleSort('us_fee_value')} className="hover:text-slate-900 transition-colors" aria-label="Sort by US fee">
                    US Fee{sortArrow('us_fee_value')}
                  </button>
                  <InfoTip text={feeTooltips.us_fee_value} />
                </th>
                <th scope="col" className="px-4 py-3 text-left font-semibold text-sm" aria-sort={sortCol === 'fx_rate' ? (sortDir === 1 ? 'ascending' : 'descending') : undefined}>
                  <button onClick={() => handleSort('fx_rate')} className="hover:text-slate-900 transition-colors" aria-label="Sort by FX rate">
                    FX Rate{sortArrow('fx_rate')}
                  </button>
                  <InfoTip text={feeTooltips.fx_rate} />
                </th>
                <th scope="col" className="px-4 py-3 text-center font-semibold text-sm">
                  CHESS
                  <InfoTip text={feeTooltips.chess} />
                </th>
                <th scope="col" className="px-4 py-3 text-center font-semibold text-sm">SMSF</th>
                <th scope="col" className="px-4 py-3 text-center font-semibold text-sm" aria-sort={sortCol === 'rating' ? (sortDir === 1 ? 'ascending' : 'descending') : undefined}>
                  <button onClick={() => handleSort('rating')} className="hover:text-slate-900 transition-colors" aria-label="Sort by rating">
                    Rating{sortArrow('rating')}
                  </button>
                </th>
                <th scope="col" className="px-4 py-3 text-center font-semibold text-sm"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {sorted.map(broker => (
                <tr
                  key={broker.id}
                  className={`group hover:bg-slate-50 transition-colors duration-150 ${
                    isSponsored(broker)
                      ? 'bg-blue-50/30 border-l-2 border-l-blue-400'
                      : editorPicks[broker.slug]
                      ? 'bg-emerald-50/40'
                      : ''
                  }`}
                >
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(broker.slug)}
                      disabled={!selected.has(broker.slug) && selected.size >= 4}
                      onChange={() => toggleSelected(broker.slug)}
                      className="w-4 h-4 accent-slate-700 rounded disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label={`Select ${broker.name} for comparison`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[0.69rem] font-bold shrink-0 transition-transform duration-200 group-hover:scale-110"
                        style={{ background: `${broker.color}18`, color: broker.color }}
                      >
                        {broker.icon || broker.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <a href={`/broker/${broker.slug}`} className="font-semibold text-brand hover:text-slate-900 transition-colors">
                            {broker.name}
                          </a>
                          <PromoBadge broker={broker} />
                          {campaignWinners.some(w => w.broker_slug === broker.slug) && (
                            <span className="text-[0.69rem] font-bold px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-full uppercase tracking-wide">Sponsored</span>
                          )}
                          {!campaignWinners.some(w => w.broker_slug === broker.slug) && <SponsorBadge broker={broker} />}
                        </div>
                        {!isSponsored(broker) && editorPicks[broker.slug] && (
                          <div className="text-[0.69rem] font-extrabold text-slate-700 uppercase tracking-wide">
                            {editorPicks[broker.slug]}
                          </div>
                        )}
                      </div>
                      <ShortlistButton slug={broker.slug} name={broker.name} size="sm" />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">{broker.asx_fee || 'N/A'}</td>
                  <td className="px-4 py-3 text-sm">{broker.us_fee || 'N/A'}</td>
                  <td className="px-4 py-3 text-sm">{broker.fx_rate != null ? `${broker.fx_rate}%` : 'N/A'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={broker.chess_sponsored ? 'text-emerald-600 font-semibold' : 'text-red-500'}>
                      {broker.chess_sponsored ? '✓ Yes' : '✗ No'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={broker.smsf_support ? 'text-emerald-600 font-semibold' : 'text-red-500'}>
                      {broker.smsf_support ? '✓ Yes' : '✗ No'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-amber">{renderStars(broker.rating || 0)}</span>
                    <span className="text-sm text-slate-500 ml-1">{broker.rating}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <a
                      href={(() => {
                        const link = getAffiliateLink(broker);
                        const cid = cpcCampaignMap.get(broker.slug);
                        return cid ? `${link}${link.includes('?') ? '&' : '?'}cid=${cid}` : link;
                      })()}
                      target="_blank"
                      rel={AFFILIATE_REL}
                      onClick={() => trackClick(broker.slug, broker.name, 'compare-table', '/compare', 'compare')}
                      className="inline-block px-4 py-2 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-700 transition-all duration-200 group-hover:scale-105 group-hover:shadow-lg"
                    >
                      {getBenefitCta(broker, 'compare')}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </ScrollReveal>
        </div>

        {/* Mobile Cards */}
        <div key={`mobile-${activeFilter}-${searchQuery}`} className={`md:hidden space-y-3 tab-content-enter overflow-x-hidden ${selected.size >= 2 ? 'pb-20' : ''}`}>
          {/* Selection hint — shown until first selection */}
          {selected.size === 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[0.69rem] text-slate-500">
              <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Tap circles to select 2–4 brokers for side-by-side comparison
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

        {/* Export Buttons — hide on mobile */}
        {sorted.length > 0 && (
          <div className="hidden md:flex flex-wrap gap-2 mt-4 no-print">
            <button
              onClick={() => {
                const headers = ["Broker", "ASX Fee", "US Fee", "FX Rate (%)", "CHESS", "SMSF", "Rating"];
                const rows = sorted.map(b => [
                  b.name,
                  b.asx_fee || "N/A",
                  b.us_fee || "N/A",
                  b.fx_rate != null ? String(b.fx_rate) : "N/A",
                  b.chess_sponsored ? "Yes" : "No",
                  b.smsf_support ? "Yes" : "No",
                  b.rating != null ? String(b.rating) : "N/A",
                ]);
                downloadCSV("broker-comparison.csv", headers, rows);
                trackEvent("export_csv", { page: "compare", count: String(sorted.length) }, "/compare");
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-600"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export CSV
            </button>
            <button
              onClick={() => {
                const slugs = sorted.map(b => b.slug).join(",");
                window.open(`/export/comparison?brokers=${slugs}`, "_blank");
                trackEvent("export_pdf", { page: "compare", count: String(sorted.length) }, "/compare");
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-600"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Export PDF
            </button>
          </div>
        )}

        {selected.size >= 2 && (
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900 text-white py-2.5 md:py-3 shadow-lg bounce-in-up" style={{ paddingBottom: 'max(0.625rem, env(safe-area-inset-bottom))' }}>
            <div className="container-custom flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {/* Selected broker avatars — mobile only */}
                <div className="flex -space-x-1.5 shrink-0 md:hidden">
                  {Array.from(selected).slice(0, 4).map(slug => {
                    const br = brokers.find(b => b.slug === slug);
                    if (!br) return null;
                    return (
                      <div
                        key={slug}
                        className="w-6 h-6 rounded-full border-2 border-slate-900 flex items-center justify-center text-[0.45rem] font-bold shrink-0"
                        style={{ background: br.color, color: 'white' }}
                        title={br.name}
                      >
                        {br.icon || br.name.charAt(0)}
                      </div>
                    );
                  })}
                </div>
                <span className="text-xs md:text-sm font-semibold truncate">
                  {selected.size}/4 selected
                </span>
              </div>
              <Link
                href={`/versus?vs=${Array.from(selected).join(',')}`}
                className="shrink-0 px-4 py-2 min-h-[44px] inline-flex items-center md:px-5 md:py-2 bg-white text-slate-700 font-bold text-xs md:text-sm rounded-lg hover:bg-slate-50 transition-colors"
              >
                Compare →
              </Link>
            </div>
          </div>
        )}

        {sorted.length === 0 && (
          <div className="text-center py-8 md:py-12 text-slate-500" role="status">
            {searchQuery ? (
              <>
                <p className="text-sm md:text-lg font-medium mb-1.5">No brokers match &ldquo;{searchQuery}&rdquo;</p>
                <button
                  onClick={() => { setSearchQuery(""); setActiveFilter('all'); }}
                  className="text-blue-700 text-sm font-semibold hover:text-blue-800 transition-colors"
                >
                  Clear all filters
                </button>
              </>
            ) : (
              <>
                <p className="text-sm mb-2">No brokers match this filter. Try a different category.</p>
                <button
                  onClick={() => setActiveFilter('all')}
                  className="text-blue-700 text-sm font-semibold hover:text-blue-800 transition-colors"
                >
                  Show all brokers
                </button>
              </>
            )}
          </div>
        )}

        {/* Pro upsell */}
        <div className="mt-6 md:mt-8">
          <ProUpsellBanner variant="compact" />
        </div>

        {/* Trust signals */}
        <div className="mt-4 md:mt-8 text-[0.62rem] md:text-xs text-slate-400 text-center">
          <p>
            Fees verified against official pricing.{" "}
            <Link href="/how-we-verify" className="underline hover:text-slate-600">Verification</Link>
            {" · "}
            <Link href="/methodology" className="underline hover:text-slate-600">Rankings</Link>
            {" · "}
            <Link href="/how-we-earn" className="underline hover:text-slate-600">How we earn</Link>
          </p>
        </div>

        {/* General Advice Warning */}
        <p className="mt-2 md:mt-3 text-[0.58rem] md:text-[0.69rem] text-slate-400 text-center leading-relaxed max-w-3xl mx-auto">
          {GENERAL_ADVICE_WARNING}
        </p>

        {/* Sponsored display ad */}
        <AdSlot
          placement="display-sidebar-compare"
          variant="in-content"
          page="/compare"
          brokers={brokers}
        />

        {/* Bottom conversion — compact on mobile */}
        <div className="mt-5 md:mt-8 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-6 flex items-center md:block gap-3">
            <Icon name="target" size={20} className="text-slate-600 shrink-0 md:mb-2" />
            <div className="flex-1 min-w-0">
              <h2 className="text-sm md:text-lg font-bold text-slate-900 mb-0.5 md:mb-1">Find Your Broker</h2>
              <p className="text-xs text-slate-500 md:mb-4 hidden md:block">Answer 4 quick questions and narrow down brokers.</p>
            </div>
            <Link href="/quiz" className="shrink-0 px-3 md:px-5 py-2 md:py-2.5 bg-amber-500 text-white text-xs md:text-sm font-bold rounded-lg hover:bg-amber-600 transition-colors md:inline-block">
              Quiz →
            </Link>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 md:p-6 flex items-center md:block gap-3">
            <Icon name="bar-chart" size={20} className="text-slate-700 shrink-0 md:mb-2" />
            <div className="flex-1 min-w-0">
              <h2 className="text-sm md:text-lg font-bold text-slate-900 mb-0.5 md:mb-1">Free Fee PDF</h2>
              <p className="text-xs text-slate-500 md:mb-4 hidden md:block">Every broker&apos;s fees and hidden costs in one document.</p>
            </div>
            <Link href="/#email-capture" className="shrink-0 px-3 md:px-5 py-2 md:py-2.5 bg-slate-900 text-white text-xs md:text-sm font-bold rounded-lg hover:bg-slate-800 transition-colors md:inline-block">
              Get PDF →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
