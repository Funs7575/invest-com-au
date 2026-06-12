import Icon from "@/components/Icon";
import type { LotProfile } from "@/lib/listings/lot-profile";

/**
 * Comparable sales — auction-catalogue market context from the listing's
 * structured `comparable_sales[]`. Pure factual history with the
 * past-performance caveat built in; hidden when the listing carries no
 * comps.
 */
export default function LotComparables({ profile }: { profile: LotProfile }) {
  if (profile.comparables.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-1">
        <Icon name="bar-chart" size={16} className="text-slate-500" />
        <h2 className="text-base font-bold text-slate-900">Recent comparable sales</h2>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Market context stated by the seller — verify against independent sources.
      </p>

      <ul className="divide-y divide-slate-100">
        {profile.comparables.map((comp, i) => (
          <li key={`${comp.label}-${i}`} className="flex items-baseline justify-between gap-4 py-2.5">
            <div className="min-w-0">
              <p className="text-sm text-slate-800 truncate">{comp.label}</p>
              <p className="text-xs text-slate-500">
                {[comp.when, comp.source].filter(Boolean).join(" · ")}
              </p>
            </div>
            {comp.price && (
              <p className="text-sm font-bold text-slate-900 whitespace-nowrap">{comp.price}</p>
            )}
          </li>
        ))}
      </ul>

      <p className="mt-4 text-xs text-slate-400">
        Past sales are not an indicator of future prices.
      </p>
    </div>
  );
}
