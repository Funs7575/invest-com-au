"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, X } from "lucide-react";
import type { Broker } from "@/lib/types";
import { trackClick, trackEvent, getAffiliateLink, getBenefitCta, renderStars, AFFILIATE_REL } from "@/lib/tracking";
import BrokerCard from "@/components/BrokerCard";
import CompactDisclosure from "@/components/CompactDisclosure";
import { FeesFreshnessIndicator } from "@/components/FeesFreshnessIndicator";
import { getMostRecentFeeCheck } from "@/lib/utils";

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
  asx_fee_value: "The brokerage you pay per ASX trade. Lower is better.",
  us_fee_value: "Cost per US share trade (excl. FX). Some brokers charge $0.",
  fx_rate: "Currency conversion markup on international trades. Big 4 banks charge ~0.7%.",
  chess: "CHESS = your shares registered in your name. Safer if the broker fails.",
};

function InfoTip({ text }: { text: string }) {
  return (
    <span className="relative group ml-1 inline-flex">
      <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-slate-200 text-slate-500 text-[0.55rem] font-bold cursor-help">?</span>
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 bg-slate-800 text-white text-xs rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-10 max-w-[220px] whitespace-normal text-center leading-tight">
        {text}
      </span>
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
    return [...filtered].sort((a, b) => {
      const av = a[sortCol] ?? 999;
      const bv = b[sortCol] ?? 999;
      if (typeof av === 'string' && typeof bv === 'string') {
        return av.toLowerCase() < bv.toLowerCase() ? -sortDir : sortDir;
      }
      return ((av as number) - (bv as number)) * sortDir;
    });
  }, [filtered, sortCol, sortDir]);

  // Compute editor picks
  const editorPicks = useMemo(() => {
    const picks: Record<string, string> = {};
    const nonCrypto = sorted.filter(b => !b.is_crypto);
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
    <div className="py-12">
      <div className="container-custom">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Compare Australian Brokers</h1>
        <p className="text-slate-600 mb-6">
          Side-by-side comparison of fees, features, and safety.{" "}
          <FeesFreshnessIndicator lastChecked={getMostRecentFeeCheck(brokers)} variant="inline" />
        </p>

        {/* Deal of the Month Banner */}
        {(() => {
          const dealBroker = brokers.find(b => b.deal && b.deal_text);
          if (!dealBroker) return null;
          return (
            <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="text-2xl">🔥</div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-amber-700 mb-0.5">Deal of the Month</div>
                  <p className="text-sm text-slate-700">
                    <strong>{dealBroker.name}</strong> — {dealBroker.deal_text}
                  </p>
                </div>
              </div>
              <a
                href={getAffiliateLink(dealBroker)}
                target="_blank"
                rel={AFFILIATE_REL}
                onClick={() => trackClick(dealBroker.slug, dealBroker.name, 'compare-deal-banner', '/compare', 'compare')}
                className="shrink-0 px-4 py-2 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-700 transition-colors"
              >
                Claim Deal →
              </a>
            </div>
          );
        })()}

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2 mb-4" role="tablist" aria-label="Broker filter">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              role="tab"
              aria-selected={activeFilter === f.key}
              className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
                activeFilter === f.key
                  ? 'bg-green-700 text-white shadow-sm scale-105'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:scale-[1.02]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search brokers by name..."
            className="w-full md:w-80 px-4 py-2.5 pl-10 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-green-700 focus:ring-1 focus:ring-green-700"
            aria-label="Search brokers by name"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 md:right-auto md:left-[18.5rem] top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Quiz prompt inline */}
        <div className="flex items-center gap-2 mb-4 text-xs text-slate-500">
          <span>Not sure which to pick?</span>
          <Link href="/quiz" className="text-green-700 font-semibold hover:text-green-800 transition-colors">
            Take the 60-sec quiz →
          </Link>
        </div>

        {/* Compact legal disclosures — collapsed accordion */}
        <div className="mb-6 border border-slate-100 rounded-lg px-4">
          <CompactDisclosure />
        </div>

        {/* Desktop Table */}
        <div key={`${activeFilter}-${searchQuery}`} className="hidden md:block overflow-x-auto motion-safe:tab-content-enter">
          <table className="w-full border border-slate-200 rounded-lg">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-3 w-10"></th>
                <th className="px-4 py-3 text-left font-semibold text-sm" aria-sort={sortCol === 'name' ? (sortDir === 1 ? 'ascending' : 'descending') : undefined}>
                  <button onClick={() => handleSort('name')} className="hover:text-green-700 transition-colors" aria-label="Sort by broker name">
                    Broker{sortArrow('name')}
                  </button>
                </th>
                <th className="px-4 py-3 text-left font-semibold text-sm" aria-sort={sortCol === 'asx_fee_value' ? (sortDir === 1 ? 'ascending' : 'descending') : undefined}>
                  <button onClick={() => handleSort('asx_fee_value')} className="hover:text-green-700 transition-colors" aria-label="Sort by ASX fee">
                    ASX Fee{sortArrow('asx_fee_value')}
                  </button>
                  <InfoTip text={feeTooltips.asx_fee_value} />
                </th>
                <th className="px-4 py-3 text-left font-semibold text-sm" aria-sort={sortCol === 'us_fee_value' ? (sortDir === 1 ? 'ascending' : 'descending') : undefined}>
                  <button onClick={() => handleSort('us_fee_value')} className="hover:text-green-700 transition-colors" aria-label="Sort by US fee">
                    US Fee{sortArrow('us_fee_value')}
                  </button>
                  <InfoTip text={feeTooltips.us_fee_value} />
                </th>
                <th className="px-4 py-3 text-left font-semibold text-sm" aria-sort={sortCol === 'fx_rate' ? (sortDir === 1 ? 'ascending' : 'descending') : undefined}>
                  <button onClick={() => handleSort('fx_rate')} className="hover:text-green-700 transition-colors" aria-label="Sort by FX rate">
                    FX Rate{sortArrow('fx_rate')}
                  </button>
                  <InfoTip text={feeTooltips.fx_rate} />
                </th>
                <th className="px-4 py-3 text-center font-semibold text-sm">
                  CHESS
                  <InfoTip text={feeTooltips.chess} />
                </th>
                <th className="px-4 py-3 text-center font-semibold text-sm">SMSF</th>
                <th className="px-4 py-3 text-center font-semibold text-sm" aria-sort={sortCol === 'rating' ? (sortDir === 1 ? 'ascending' : 'descending') : undefined}>
                  <button onClick={() => handleSort('rating')} className="hover:text-green-700 transition-colors" aria-label="Sort by rating">
                    Rating{sortArrow('rating')}
                  </button>
                </th>
                <th className="px-4 py-3 text-center font-semibold text-sm"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {sorted.map(broker => (
                <tr
                  key={broker.id}
                  className={`hover:bg-slate-50 transition-colors duration-150 ${editorPicks[broker.slug] ? 'bg-green-50/40' : ''}`}
                >
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(broker.slug)}
                      disabled={!selected.has(broker.slug) && selected.size >= 4}
                      onChange={() => toggleSelected(broker.slug)}
                      className="w-4 h-4 accent-green-700 rounded disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label={`Select ${broker.name} for comparison`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[0.6rem] font-bold shrink-0"
                        style={{ background: `${broker.color}18`, color: broker.color }}
                      >
                        {broker.icon || broker.name.charAt(0)}
                      </div>
                      <div>
                        <a href={`/broker/${broker.slug}`} className="font-semibold text-brand hover:text-green-700 transition-colors">
                          {broker.name}
                        </a>
                        {editorPicks[broker.slug] && (
                          <div className="text-[0.6rem] font-extrabold text-green-700 uppercase tracking-wide">
                            {editorPicks[broker.slug]}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">{broker.asx_fee || 'N/A'}</td>
                  <td className="px-4 py-3 text-sm">{broker.us_fee || 'N/A'}</td>
                  <td className="px-4 py-3 text-sm">{broker.fx_rate != null ? `${broker.fx_rate}%` : 'N/A'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={broker.chess_sponsored ? 'text-green-600 font-semibold' : 'text-red-500'}>
                      {broker.chess_sponsored ? '✓ Yes' : '✗ No'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={broker.smsf_support ? 'text-green-600 font-semibold' : 'text-red-500'}>
                      {broker.smsf_support ? '✓ Yes' : '✗ No'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-amber">{renderStars(broker.rating || 0)}</span>
                    <span className="text-sm text-slate-500 ml-1">{broker.rating}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <a
                      href={getAffiliateLink(broker)}
                      target="_blank"
                      rel={AFFILIATE_REL}
                      onClick={() => trackClick(broker.slug, broker.name, 'compare-table', '/compare', 'compare')}
                      className="inline-block px-4 py-2 bg-green-700 text-white text-sm font-semibold rounded-lg hover:bg-green-800 transition-colors"
                    >
                      {getBenefitCta(broker, 'compare')}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div key={`mobile-${activeFilter}-${searchQuery}`} className="md:hidden space-y-4 motion-safe:tab-content-enter">
          {sorted.map(broker => (
            <BrokerCard
              key={broker.id}
              broker={broker}
              badge={editorPicks[broker.slug]}
              context="compare"
            />
          ))}
        </div>

        {selected.size >= 2 && (
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-green-700 text-white py-3 shadow-lg bounce-in-up">
            <div className="container-custom flex items-center justify-between">
              <span className="text-sm font-semibold">
                {selected.size}/4 brokers selected
              </span>
              <Link
                href={`/versus?vs=${Array.from(selected).join(',')}`}
                className="px-5 py-2 bg-white text-green-700 font-bold text-sm rounded-lg hover:bg-green-50 transition-colors"
              >
                Compare Side-by-Side →
              </Link>
            </div>
          </div>
        )}

        {sorted.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            {searchQuery ? (
              <>
                <p className="text-lg font-medium mb-2">No brokers match &ldquo;{searchQuery}&rdquo;</p>
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-green-700 font-semibold hover:text-green-800 transition-colors"
                >
                  Clear search
                </button>
              </>
            ) : (
              "No brokers match this filter. Try a different category."
            )}
          </div>
        )}

        {/* Bottom conversion section */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="text-2xl mb-2">🎯</div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Filter by Your Priorities</h3>
            <p className="text-sm text-slate-600 mb-4">Answer 4 quick questions and narrow down brokers based on what matters to you.</p>
            <Link href="/quiz" className="inline-block px-5 py-2.5 bg-amber-500 text-slate-900 text-sm font-semibold rounded-lg hover:bg-amber-600 transition-colors">
              Take the Quiz →
            </Link>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-6">
            <div className="text-2xl mb-2">📊</div>
            <h3 className="text-lg font-bold text-green-900 mb-1">Free Fee Comparison PDF</h3>
            <p className="text-sm text-slate-600 mb-4">Download our 2026 fee audit — every broker&apos;s brokerage, FX fees, and hidden costs in one document.</p>
            <Link href="/#email-capture" className="inline-block px-5 py-2.5 bg-green-700 text-white text-sm font-semibold rounded-lg hover:bg-green-800 transition-colors">
              Get Free PDF →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
