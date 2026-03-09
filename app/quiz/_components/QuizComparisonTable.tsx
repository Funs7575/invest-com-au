"use client";

import type { Broker } from "@/lib/types";
import { trackClick, getAffiliateLink, AFFILIATE_REL } from "@/lib/tracking";
import RiskWarningInline from "@/components/RiskWarningInline";

interface ScoredResult {
  slug: string;
  total: number;
  broker?: Broker;
}

interface Props {
  allResults: ScoredResult[];
}

export default function QuizComparisonTable({ allResults }: Props) {
  if (allResults.length <= 1) return null;

  // Determine if results are mostly share brokers for column selection
  const hasShareBrokers = allResults.some(r => r.broker && (!r.broker.platform_type || r.broker.platform_type === 'share_broker'));
  const showShareCols = hasShareBrokers || allResults.every(r => !r.broker?.platform_type);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-3 md:mb-6 result-card-in result-card-in-delay-2">
      <div className="px-3 py-2 md:px-4 md:py-3 bg-slate-50 border-b border-slate-200">
        <h3 className="text-xs md:text-sm font-bold text-slate-700">Quick Comparison</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs md:text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th scope="col" className="px-2.5 md:px-4 py-1.5 md:py-2 text-left text-[0.62rem] md:text-xs text-slate-500 font-medium">Platform</th>
              <th scope="col" className="px-2 md:px-3 py-1.5 md:py-2 text-center text-[0.62rem] md:text-xs text-slate-500 font-medium">Type</th>
              {showShareCols && (
                <th scope="col" className="px-2 md:px-3 py-1.5 md:py-2 text-center text-[0.62rem] md:text-xs text-slate-500 font-medium hidden md:table-cell">ASX Fee</th>
              )}
              <th scope="col" className="px-2 md:px-3 py-1.5 md:py-2 text-center text-[0.62rem] md:text-xs text-slate-500 font-medium">Rating</th>
              <th scope="col" className="px-2 md:px-3 py-1.5 md:py-2 text-center text-[0.62rem] md:text-xs text-slate-500 font-medium"><span className="sr-only">Action</span></th>
            </tr>
          </thead>
          <tbody>
            {allResults.map((r, i) => r.broker && (
              <tr key={r.slug} className={`border-b border-slate-50 ${i === 0 ? 'bg-emerald-50/30' : ''}`}>
                <td className="px-2.5 md:px-4 py-2 md:py-2.5">
                  <div className="flex items-center gap-1.5 md:gap-2">
                    <div
                      className="w-5 h-5 md:w-6 md:h-6 rounded flex items-center justify-center text-[0.5rem] md:text-[0.69rem] font-bold shrink-0"
                      style={{ background: `${r.broker.color}20`, color: r.broker.color }}
                    >
                      {r.broker.icon || r.broker.name.charAt(0)}
                    </div>
                    <span className="font-semibold text-[0.69rem] md:text-xs">{r.broker.name}</span>
                    {i === 0 && <span className="text-[0.45rem] md:text-[0.5rem] px-1 py-px md:px-1.5 md:py-0.5 bg-slate-100 text-slate-700 rounded-full font-bold">TOP</span>}
                  </div>
                </td>
                <td className="px-2 md:px-3 py-2 md:py-2.5 text-center text-[0.56rem] md:text-[0.65rem]">
                  <span className="px-1 py-0.5 rounded bg-slate-100 text-slate-600">
                    {r.broker.platform_type === 'crypto_exchange' ? 'Crypto'
                      : r.broker.platform_type === 'robo_advisor' ? 'Robo'
                      : r.broker.platform_type === 'research_tool' ? 'Research'
                      : r.broker.platform_type === 'super_fund' ? 'Super'
                      : r.broker.platform_type === 'property_platform' ? 'Property'
                      : r.broker.platform_type === 'cfd_forex' ? 'CFD/FX'
                      : 'Shares'}
                  </span>
                </td>
                {showShareCols && (
                  <td className="px-2 md:px-3 py-2 md:py-2.5 text-center text-[0.62rem] md:text-xs hidden md:table-cell">
                    {(!r.broker.platform_type || r.broker.platform_type === 'share_broker') ? (r.broker.asx_fee || 'N/A') : '—'}
                  </td>
                )}
                <td className="px-2 md:px-3 py-2 md:py-2.5 text-center text-[0.62rem] md:text-xs font-semibold">{r.broker.rating}/5</td>
                <td className="px-2 md:px-3 py-2 md:py-2.5 text-center">
                  <a
                    href={getAffiliateLink(r.broker)}
                    target="_blank"
                    rel={AFFILIATE_REL}
                    onClick={() => trackClick(r.broker!.slug, r.broker!.name, `quiz-compare-${i + 1}`, '/quiz', 'quiz')}
                    className="inline-block px-2 py-1 md:px-3 md:py-1.5 bg-amber-600 text-white text-[0.62rem] md:text-xs font-semibold rounded-md hover:bg-amber-700 transition-colors"
                  >
                    Visit →
                  </a>
                  <RiskWarningInline />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
