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
import ABTestCTA from "@/components/ABTestCTA";
import type { ABTestConfig } from "@/lib/ab-test";

type FilterType = 'all' | 'shares' | 'beginner' | 'chess' | 'free' | 'us' | 'smsf' | 'low-fx' | 'crypto' | 'robo' | 'research' | 'super' | 'property' | 'cfd' | 'savings' | 'term-deposits' | 'has-deal';
type SortCol = 'name' | 'asx_fee_value' | 'us_fee_value' | 'fx_rate' | 'rating';

/* ─── Vertical-specific column headers & tooltips ─── */
interface ColumnConfig {
  col1: { label: string; tooltip: string; sortCol: SortCol };
  col2: { label: string; tooltip: string; sortCol: SortCol };
  col3: { label: string; tooltip: string; sortCol: SortCol };
  feat1: { label: string; tooltip: string };
  feat2: { label: string };
}

const DEFAULT_COLUMNS: ColumnConfig = {
  col1: { label: 'ASX Fee', tooltip: '', sortCol: 'asx_fee_value' },
  col2: { label: 'US Fee', tooltip: '', sortCol: 'us_fee_value' },
  col3: { label: 'FX Rate', tooltip: '', sortCol: 'fx_rate' },
  feat1: { label: 'CHESS', tooltip: '' },
  feat2: { label: 'SMSF' },
};

const COLUMN_CONFIG: Partial<Record<FilterType, ColumnConfig>> = {
  shares: {
    col1: { label: 'ASX Fee', tooltip: 'Brokerage per trade on ASX', sortCol: 'asx_fee_value' },
    col2: { label: 'US Fee', tooltip: 'Commission per US stock trade', sortCol: 'us_fee_value' },
    col3: { label: 'FX Rate', tooltip: 'Currency conversion fee percentage', sortCol: 'fx_rate' },
    feat1: { label: 'CHESS', tooltip: 'CHESS-sponsored holdings' },
    feat2: { label: 'SMSF' },
  },
  super: {
    col1: { label: 'Mgmt Fee', tooltip: 'Annual administration / management fee', sortCol: 'asx_fee_value' },
    col2: { label: 'Type', tooltip: 'Industry, retail, or public-sector fund', sortCol: 'us_fee_value' },
    col3: { label: 'Insurance', tooltip: 'Default insurance cover included', sortCol: 'fx_rate' },
    feat1: { label: 'Options', tooltip: 'Number of investment options available' },
    feat2: { label: 'ESG' },
  },
  savings: {
    col1: { label: 'Rate', tooltip: 'Annual interest rate (with conditions met)', sortCol: 'asx_fee_value' },
    col2: { label: 'Min Deposit', tooltip: 'Minimum deposit to open', sortCol: 'us_fee_value' },
    col3: { label: 'Conditions', tooltip: 'Requirements to earn bonus rate', sortCol: 'fx_rate' },
    feat1: { label: 'ADI', tooltip: 'Government deposit guarantee (up to $250,000)' },
    feat2: { label: 'Online' },
  },
  'term-deposits': {
    col1: { label: 'Rate', tooltip: 'Term deposit rate (6-month term)', sortCol: 'asx_fee_value' },
    col2: { label: 'Min Deposit', tooltip: 'Minimum deposit to open', sortCol: 'us_fee_value' },
    col3: { label: 'Conditions', tooltip: 'Terms and early withdrawal rules', sortCol: 'fx_rate' },
    feat1: { label: 'ADI', tooltip: 'Government deposit guarantee (up to $250,000)' },
    feat2: { label: 'Online' },
  },
  crypto: {
    col1: { label: 'Trading Fee', tooltip: 'Fee per crypto trade (maker/taker)', sortCol: 'asx_fee_value' },
    col2: { label: 'Coins', tooltip: 'Number of cryptocurrencies available', sortCol: 'us_fee_value' },
    col3: { label: 'FX Rate', tooltip: 'AUD deposit/withdrawal fee', sortCol: 'fx_rate' },
    feat1: { label: 'Staking', tooltip: 'Staking rewards supported' },
    feat2: { label: 'Wallet' },
  },
  cfd: {
    col1: { label: 'Spread', tooltip: 'Typical spread on major pairs', sortCol: 'asx_fee_value' },
    col2: { label: 'Leverage', tooltip: 'Maximum leverage for retail clients', sortCol: 'us_fee_value' },
    col3: { label: 'Markets', tooltip: 'Number of tradeable instruments', sortCol: 'fx_rate' },
    feat1: { label: 'Demo', tooltip: 'Free demo account available' },
    feat2: { label: 'MT4/MT5' },
  },
  robo: {
    col1: { label: 'Mgmt Fee', tooltip: 'Annual management fee percentage', sortCol: 'asx_fee_value' },
    col2: { label: 'Min Investment', tooltip: 'Minimum initial investment', sortCol: 'us_fee_value' },
    col3: { label: 'Portfolio Type', tooltip: 'ETF, direct shares, or hybrid', sortCol: 'fx_rate' },
    feat1: { label: 'ESG', tooltip: 'Ethical/ESG portfolio option available' },
    feat2: { label: 'Tax-Loss' },
  },
  property: {
    col1: { label: 'Min Investment', tooltip: 'Minimum investment amount', sortCol: 'asx_fee_value' },
    col2: { label: 'Returns', tooltip: 'Historical or projected annual return', sortCol: 'us_fee_value' },
    col3: { label: 'Type', tooltip: 'REIT, fractional, or direct property', sortCol: 'fx_rate' },
    feat1: { label: 'Liquidity', tooltip: 'Ability to sell/redeem investment' },
    feat2: { label: 'SMSF' },
  },
  research: {
    col1: { label: 'Price', tooltip: 'Monthly subscription cost', sortCol: 'asx_fee_value' },
    col2: { label: 'Markets', tooltip: 'Number of markets covered', sortCol: 'us_fee_value' },
    col3: { label: 'Alerts', tooltip: 'Real-time alerts and notifications', sortCol: 'fx_rate' },
    feat1: { label: 'Screener', tooltip: 'Stock screener included' },
    feat2: { label: 'API' },
  },
};

function getColumnConfig(filter: FilterType): ColumnConfig {
  return COLUMN_CONFIG[filter] || DEFAULT_COLUMNS;
}

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
  activeABTests: ABTestConfig[];
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
  activeABTests,
  onSort,
  onToggleSelected,
  sortArrow,
  InfoTip,
  feeTooltips,
}: Props) {
  const cols = getColumnConfig(activeFilter);

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
            <th scope="col" className="px-4 py-3 text-left font-semibold text-sm" aria-sort={sortCol === cols.col1.sortCol ? (sortDir === 1 ? 'ascending' : 'descending') : undefined}>
              <button onClick={() => onSort(cols.col1.sortCol)} className="hover:text-slate-900 transition-colors" aria-label={`Sort by ${cols.col1.label}`}>
                {cols.col1.label}{sortArrow(cols.col1.sortCol)}
              </button>
              <InfoTip text={cols.col1.tooltip || feeTooltips.asx_fee_value} />
            </th>
            <th scope="col" className="px-4 py-3 text-left font-semibold text-sm" aria-sort={sortCol === cols.col2.sortCol ? (sortDir === 1 ? 'ascending' : 'descending') : undefined}>
              <button onClick={() => onSort(cols.col2.sortCol)} className="hover:text-slate-900 transition-colors" aria-label={`Sort by ${cols.col2.label}`}>
                {cols.col2.label}{sortArrow(cols.col2.sortCol)}
              </button>
              <InfoTip text={cols.col2.tooltip || feeTooltips.us_fee_value} />
            </th>
            <th scope="col" className="px-4 py-3 text-left font-semibold text-sm" aria-sort={sortCol === cols.col3.sortCol ? (sortDir === 1 ? 'ascending' : 'descending') : undefined}>
              <button onClick={() => onSort(cols.col3.sortCol)} className="hover:text-slate-900 transition-colors" aria-label={`Sort by ${cols.col3.label}`}>
                {cols.col3.label}{sortArrow(cols.col3.sortCol)}
              </button>
              <InfoTip text={cols.col3.tooltip || feeTooltips.fx_rate} />
            </th>
            <th scope="col" className="px-4 py-3 text-center font-semibold text-sm">
              {cols.feat1.label}
              <InfoTip text={cols.feat1.tooltip || feeTooltips.chess} />
            </th>
            <th scope="col" className="px-4 py-3 text-center font-semibold text-sm">{cols.feat2.label}</th>
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
                <div className="flex items-center gap-2.5 flex-wrap">
                  <BrokerLogo broker={broker} size="sm" className="transition-transform duration-200 group-hover:scale-110 shrink-0" />
                  <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                    <a href={`/broker/${broker.slug}`} className="font-semibold text-brand hover:text-slate-900 transition-colors">
                      {broker.name}
                    </a>
                    {!isSponsored(broker) && editorPicks[broker.slug] && (
                      <span className="text-[0.62rem] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full uppercase tracking-wide whitespace-nowrap">
                        {editorPicks[broker.slug]}
                      </span>
                    )}
                    <PromoBadge broker={broker} />
                    {campaignWinners.some(w => w.broker_slug === broker.slug) && (
                      <span className="text-[0.69rem] font-bold px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-full uppercase tracking-wide">Sponsored</span>
                    )}
                    {!campaignWinners.some(w => w.broker_slug === broker.slug) && <SponsorBadge broker={broker} />}
                    {broker.affiliate_url && !isSponsored(broker) && !campaignWinners.some(w => w.broker_slug === broker.slug) && (
                      <span title="We may earn a commission if you visit this platform" className="text-[0.62rem] font-semibold px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded-full uppercase tracking-wide">Ad</span>
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
                <ABTestCTA
                  broker={broker}
                  activeTests={activeABTests}
                  page="/compare"
                  cpcCampaignLink={(() => {
                    const link = getAffiliateLink(broker);
                    const cid = cpcCampaignMap.get(broker.slug);
                    return cid ? `${link}${link.includes('?') ? '&' : '?'}cid=${cid}` : `/go/${broker.slug}?placement=compare_cta`;
                  })()}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </ScrollReveal>
    </div>
  );
}
