"use client";

import { getAffiliateLink, renderStars } from "@/lib/tracking";
import ScrollReveal from "@/components/ScrollReveal";
import PromoBadge from "@/components/PromoBadge";
import SponsorBadge from "@/components/SponsorBadge";
import { isSponsored } from "@/lib/sponsorship";
import ShortlistButton from "@/components/ShortlistButton";
import BrokerLogo from "@/components/BrokerLogo";
import type { PlacementWinner } from "@/lib/sponsorship";
import ABTestCTA from "@/components/ABTestCTA";
import type { ABTestConfig } from "@/lib/ab-test";
import type { CategorySchema, RankedBroker, SortCol } from "@/lib/compare-engine";

interface Props {
  rows: RankedBroker[];
  schema: CategorySchema;
  activeFilter: string;
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
}

export default function CompareDesktopTable({
  rows,
  schema,
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
}: Props) {
  return (
    <div key={`${activeFilter}-${searchQuery}`} className="hidden md:block overflow-x-auto tab-content-enter">
      <ScrollReveal key={`table-${activeFilter}-${searchQuery}-${sortCol}-${sortDir}`} animation="table-row-stagger" as="table" className="w-full border border-slate-200 rounded-lg compare-table">
        <thead className="bg-slate-50 shadow-sm">
          <tr>
            <th scope="col" className="px-3 py-3 w-10"></th>
            <th scope="col" className="px-4 py-3 text-left font-semibold text-sm" aria-sort={sortCol === 'name' ? (sortDir === 1 ? 'ascending' : 'descending') : undefined}>
              <button onClick={() => onSort('name')} className="hover:text-slate-900 transition-colors" aria-label="Sort by platform name">
                Platform{sortArrow('name')}
              </button>
            </th>
            {schema.columns.map((column) => (
              <th key={column.key} scope="col" className={`px-4 py-3 text-${column.align ?? 'left'} font-semibold text-sm`} aria-sort={column.sortCol && sortCol === column.sortCol ? (sortDir === 1 ? 'ascending' : 'descending') : undefined}>
                {column.sortCol ? (
                  <button onClick={() => onSort(column.sortCol!)} className="hover:text-slate-900 transition-colors" aria-label={`Sort by ${column.label}`}>
                    {column.label}{sortArrow(column.sortCol)}
                  </button>
                ) : column.label}
                <InfoTip text={column.tooltip} />
              </th>
            ))}
            <th scope="col" className="px-4 py-3 text-center font-semibold text-sm">Why this result?</th>
            <th scope="col" className="px-4 py-3 text-center font-semibold text-sm"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {rows.map(row => {
            const broker = row.broker;
            const isCampaignWinner = campaignWinners.some(w => w.broker_slug === broker.slug);
            return (
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
                    aria-label={`Pin ${broker.name} to shortlist`}
                  />
                </td>
                <td className="px-4 py-3 min-w-56">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <BrokerLogo broker={broker} size="sm" className="transition-transform duration-200 group-hover:scale-110 shrink-0" />
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      <a href={`/broker/${broker.slug}`} className="font-semibold text-brand hover:text-slate-900 transition-colors">{broker.name}</a>
                      {!isSponsored(broker) && editorPicks[broker.slug] && <span className="text-[0.62rem] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full uppercase tracking-wide whitespace-nowrap">{editorPicks[broker.slug]}</span>}
                      <PromoBadge broker={broker} />
                      {isCampaignWinner && <span className="text-[0.69rem] font-bold px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-full uppercase tracking-wide">Sponsored</span>}
                      {!isCampaignWinner && <SponsorBadge broker={broker} />}
                    </div>
                    <ShortlistButton slug={broker.slug} name={broker.name} size="sm" />
                  </div>
                  <p className="mt-1 text-[0.68rem] uppercase tracking-wide text-slate-400">{row.commercialDisclosure}</p>
                </td>
                {schema.columns.map((column) => (
                  <td key={column.key} className={`px-4 py-3 text-sm align-top ${column.align === 'center' ? 'text-center' : ''}`}>{column.value(broker, row)}</td>
                ))}
                <td className="px-4 py-3 text-xs text-slate-600 align-top min-w-64">
                  <details>
                    <summary className="cursor-pointer font-semibold text-slate-800">Why this result?</summary>
                    <ul className="mt-2 list-disc pl-4 space-y-1">
                      {row.why.map((why) => <li key={why}>{why}</li>)}
                    </ul>
                  </details>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="mb-2 whitespace-nowrap"><span className="text-amber">{renderStars(broker.rating || 0)}</span><span className="text-sm text-slate-500 ml-1">{broker.rating}</span></div>
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
            );
          })}
        </tbody>
      </ScrollReveal>
    </div>
  );
}
