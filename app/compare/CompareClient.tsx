"use client";

import { useState, useMemo } from "react";
import type { Broker } from "@/lib/types";
import { trackClick, getAffiliateLink, getBenefitCta, renderStars } from "@/lib/tracking";
import BrokerCard from "@/components/BrokerCard";

type FilterType = 'all' | 'chess' | 'free' | 'us' | 'smsf' | 'low-fx' | 'crypto';
type SortCol = 'name' | 'asx_fee_value' | 'us_fee_value' | 'fx_rate' | 'rating';

const filters: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All Brokers' },
  { key: 'chess', label: 'CHESS Only' },
  { key: 'free', label: '$0 Trades' },
  { key: 'us', label: 'US Shares' },
  { key: 'smsf', label: 'SMSF' },
  { key: 'low-fx', label: 'Low FX' },
  { key: 'crypto', label: 'Crypto' },
];

export default function CompareClient({ brokers }: { brokers: Broker[] }) {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [sortCol, setSortCol] = useState<SortCol>('rating');
  const [sortDir, setSortDir] = useState<1 | -1>(-1);

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
      case 'chess': list = list.filter(b => b.chess_sponsored); break;
      case 'free': list = list.filter(b => (b.asx_fee_value === 0) || (b.us_fee_value === 0)); break;
      case 'us': list = list.filter(b => b.us_fee_value != null && b.us_fee_value < 999); break;
      case 'smsf': list = list.filter(b => b.smsf_support); break;
      case 'low-fx': list = list.filter(b => b.fx_rate != null && b.fx_rate > 0 && b.fx_rate < 0.5); break;
      case 'crypto': list = list.filter(b => b.is_crypto); break;
      default: list = list.filter(b => !b.is_crypto); break;
    }
    return list;
  }, [brokers, activeFilter]);

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

  const sortArrow = (col: SortCol) => sortCol === col ? (sortDir === 1 ? ' ↑' : ' ↓') : ' ⇅';

  return (
    <div className="py-12">
      <div className="container-custom">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Compare Australian Brokers</h1>
        <p className="text-slate-600 mb-6">
          Side-by-side comparison of fees, features, and safety. Updated February 2026.
        </p>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2 mb-6">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                activeFilter === f.key
                  ? 'bg-amber text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full border border-slate-200 rounded-lg">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-sm">
                  <button onClick={() => handleSort('name')} className="hover:text-amber transition-colors">
                    Broker{sortArrow('name')}
                  </button>
                </th>
                <th className="px-4 py-3 text-left font-semibold text-sm">
                  <button onClick={() => handleSort('asx_fee_value')} className="hover:text-amber transition-colors">
                    ASX Fee{sortArrow('asx_fee_value')}
                  </button>
                </th>
                <th className="px-4 py-3 text-left font-semibold text-sm">
                  <button onClick={() => handleSort('us_fee_value')} className="hover:text-amber transition-colors">
                    US Fee{sortArrow('us_fee_value')}
                  </button>
                </th>
                <th className="px-4 py-3 text-left font-semibold text-sm">
                  <button onClick={() => handleSort('fx_rate')} className="hover:text-amber transition-colors">
                    FX Rate{sortArrow('fx_rate')}
                  </button>
                </th>
                <th className="px-4 py-3 text-center font-semibold text-sm">CHESS</th>
                <th className="px-4 py-3 text-center font-semibold text-sm">SMSF</th>
                <th className="px-4 py-3 text-center font-semibold text-sm">
                  <button onClick={() => handleSort('rating')} className="hover:text-amber transition-colors">
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
                  className={`hover:bg-slate-50 ${editorPicks[broker.slug] ? 'bg-amber-50/40' : ''}`}
                >
                  <td className="px-4 py-3">
                    <a href={`/broker/${broker.slug}`} className="font-semibold text-brand hover:text-amber transition-colors">
                      {broker.name}
                    </a>
                    {editorPicks[broker.slug] && (
                      <div className="text-[0.6rem] font-extrabold text-amber-700 uppercase tracking-wide">
                        {editorPicks[broker.slug]}
                      </div>
                    )}
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
                      rel="noopener noreferrer nofollow"
                      onClick={() => trackClick(broker.slug, broker.name, 'compare-table', '/compare', 'compare')}
                      className="inline-block px-4 py-2 bg-amber text-white text-sm font-semibold rounded-lg hover:bg-amber-600 transition-colors"
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
        <div className="md:hidden space-y-4">
          {sorted.map(broker => (
            <BrokerCard
              key={broker.id}
              broker={broker}
              badge={editorPicks[broker.slug]}
              context="compare"
            />
          ))}
        </div>

        {sorted.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            No brokers match this filter. Try a different category.
          </div>
        )}
      </div>
    </div>
  );
}
