import type { CommodityEtf } from "@/lib/commodities";

interface Props {
  etf: CommodityEtf;
}

/**
 * Reusable ETF card for commodity sector hubs. Same compliance
 * philosophy as AsxTickerCard — no live price, editorial blurb
 * + static attributes only.
 */
export default function EtfComparisonCard({ etf }: Props) {
  return (
    <article className="border border-slate-200 rounded-xl bg-white p-4 hover:shadow-md transition-shadow">
      <header className="flex items-baseline justify-between gap-2 mb-2">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 leading-tight">
            {etf.ticker}
          </h3>
          <p className="text-xs text-slate-600 mt-0.5">{etf.name}</p>
        </div>
        {etf.mer_pct != null && (
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 shrink-0">
            MER {etf.mer_pct.toFixed(2)}%
          </span>
        )}
      </header>

      {etf.blurb && (
        <p className="text-xs text-slate-700 leading-snug mb-3">{etf.blurb}</p>
      )}

      <dl className="grid grid-cols-2 gap-y-1.5 text-[11px]">
        {etf.issuer && (
          <>
            <dt className="text-slate-500">Issuer</dt>
            <dd className="font-semibold text-slate-900 text-right">
              {etf.issuer}
            </dd>
          </>
        )}
        {etf.domicile && (
          <>
            <dt className="text-slate-500">Domicile</dt>
            <dd className="font-semibold text-slate-900 text-right">
              {etf.domicile}
            </dd>
          </>
        )}
        {etf.distribution_frequency && (
          <>
            <dt className="text-slate-500">Distributions</dt>
            <dd className="font-semibold text-slate-900 text-right capitalize">
              {etf.distribution_frequency}
            </dd>
          </>
        )}
        {etf.underlying_exposure && (
          <>
            <dt className="text-slate-500">Exposure</dt>
            <dd className="font-semibold text-slate-900 text-right">
              {etf.underlying_exposure}
            </dd>
          </>
        )}
      </dl>
    </article>
  );
}
