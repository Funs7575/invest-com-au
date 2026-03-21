"use client";

import Link from "next/link";
import type { Broker } from "@/lib/types";
import { trackClick, trackEvent, getAffiliateLink, getBenefitCta, renderStars, AFFILIATE_REL } from "@/lib/tracking";
import ScrollReveal from "@/components/ScrollReveal";
import PromoBadge from "@/components/PromoBadge";
import SponsorBadge from "@/components/SponsorBadge";
import { isSponsored } from "@/lib/sponsorship";
import ShortlistButton from "@/components/ShortlistButton";
import BrokerLogo from "@/components/BrokerLogo";
import type { PlacementWinner } from "@/lib/sponsorship";

type FilterType = 'all' | 'shares' | 'beginner' | 'chess' | 'free' | 'us' | 'smsf' | 'low-fx' | 'crypto' | 'robo' | 'research' | 'super' | 'property' | 'cfd' | 'savings' | 'term-deposits' | 'has-deal';
type SortCol = 'name' | 'asx_fee_value' | 'us_fee_value' | 'fx_rate' | 'rating';

interface Props {
  sorted: Broker[];
  activeFilter: FilterType;
  searchQuery: string;
  sortCol: SortCol;
  sortDir: 1 | -1;
  selected: Set<string>;
  editorPicks: Record<string, string>;
  campaignWinners: PlacementWinner[];
  cpcCampaignMap: Map<string, number>;
  onSort: (col: SortCol) => void;
  onToggleSelected: (slug: string) => void;
  sortArrow: (col: SortCol) => React.ReactNode;
  InfoTip: React.ComponentType<{ text: string }>;
  feeTooltips: Record<string, string>;
}

export default function CompareDesktopTable({
  sorted,
  activeFilter,
  searchQuery,
  sortCol,
  sortDir,
  selected,
  editorPicks,
  campaignWinners,
  cpcCampaignMap,
  onSort,
  onToggleSelected,
  sortArrow,
  InfoTip,
  feeTooltips,
}: Props) {
  return (
    <div key={`${activeFilter}-${searchQuery}`} className="hidden md:block overflow-x-auto tab-content-enter">
      <ScrollReveal key={`table-${activeFilter}-${searchQuery}-${sortCol}-${sortDir}`} animation="table-row-stagger" as="table" className="w-full border border-slate-200 rounded-lg compare-table">
        <thead className="bg-slate-50 sticky top-12 md:top-16 z-10 shadow-sm">
          <tr>
            <th scope="col" className="px-3 py-3 w-10"></th>
            <th scope="col" className="px-4 py-3 text-left font-semibold text-sm" aria-sort={sortCol === 'name' ? (sortDir === 1 ? 'ascending' : 'descending') : undefined}>
              <button onClick={() => onSort('name')} className="hover:text-slate-900 transition-colors" aria-label="Sort by platform name">
                Platform{sortArrow('name')}
              </button>
            </th>
            <th scope="col" className="px-4 py-3 text-left font-semibold text-sm" aria-sort={sortCol === 'asx_fee_value' ? (sortDir === 1 ? 'ascending' : 'descending') : undefined}>
              <button onClick={() => onSort('asx_fee_value')} className="hover:text-slate-900 transition-colors" aria-label={activeFilter === 'savings' || activeFilter === 'term-deposits' ? "Sort by rate" : "Sort by ASX fee"}>
                {activeFilter === 'savings' || activeFilter === 'term-deposits' ? 'Rate' : 'ASX Fee'}{sortArrow('asx_fee_value')}
              </button>
              <InfoTip text={activeFilter === 'savings' ? 'Annual interest rate (with conditions met)' : activeFilter === 'term-deposits' ? 'Term deposit rate (6-month term)' : feeTooltips.asx_fee_value} />
            </th>
            <th scope="col" className="px-4 py-3 text-left font-semibold text-sm" aria-sort={sortCol === 'us_fee_value' ? (sortDir === 1 ? 'ascending' : 'descending') : undefined}>
              <button onClick={() => onSort('us_fee_value')} className="hover:text-slate-900 transition-colors" aria-label="Sort by US fee">
                {activeFilter === 'savings' || activeFilter === 'term-deposits' ? 'Min Deposit' : 'US Fee'}{sortArrow('us_fee_value')}
              </button>
              <InfoTip text={activeFilter === 'savings' || activeFilter === 'term-deposits' ? 'Minimum deposit to open' : feeTooltips.us_fee_value} />
            </th>
            <th scope="col" className="px-4 py-3 text-left font-semibold text-sm" aria-sort={sortCol === 'fx_rate' ? (sortDir === 1 ? 'ascending' : 'descending') : undefined}>
              <button onClick={() => onSort('fx_rate')} className="hover:text-slate-900 transition-colors" aria-label="Sort by FX rate">
                {activeFilter === 'savings' || activeFilter === 'term-deposits' ? 'Conditions' : 'FX Rate'}{sortArrow('fx_rate')}
              </button>
              <InfoTip text={activeFilter === 'savings' || activeFilter === 'term-deposits' ? 'Requirements to earn bonus rate' : feeTooltips.fx_rate} />
            </th>
            <th scope="col" className="px-4 py-3 text-center font-semibold text-sm">
              {activeFilter === 'savings' || activeFilter === 'term-deposits' ? 'ADI' : 'CHESS'}
              <InfoTip text={activeFilter === 'savings' || activeFilter === 'term-deposits' ? 'Government deposit guarantee (up to $250,000)' : feeTooltips.chess} />
            </th>
            <th scope="col" className="px-4 py-3 text-center font-semibold text-sm">{activeFilter === 'savings' || activeFilter === 'term-deposits' ? 'Online' : 'SMSF'}</th>
            <th scope="col" className="px-4 py-3 text-center font-semibold text-sm" aria-sort={sortCol === 'rating' ? (sortDir === 1 ? 'ascending' : 'descending') : undefined}>
              <button onClick={() => onSort('rating')} className="hover:text-slate-900 transition-colors" aria-label="Sort by rating">
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
                  onChange={() => onToggleSelected(broker.slug)}
                  className="w-4 h-4 accent-slate-700 rounded disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label={`Select ${broker.name} for comparison`}
                />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <BrokerLogo broker={broker} size="sm" className="transition-transform duration-200 group-hover:scale-110" />
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
                      {broker.affiliate_url && !isSponsored(broker) && !campaignWinners.some(w => w.broker_slug === broker.slug) && (
                        <span title="We may earn a commission if you visit this platform" className="text-[0.62rem] font-semibold px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded-full uppercase tracking-wide">Ad</span>
                      )}
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
                  onClick={() => {
                    trackClick(broker.slug, broker.name, 'compare-table', '/compare', 'compare');
                    trackEvent('affiliate_click', { broker_slug: broker.slug, source: 'compare-table' }, '/compare');
                  }}
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
  );
}
