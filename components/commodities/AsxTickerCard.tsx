import type { CommodityStock } from "@/lib/commodities";

interface Props {
  stock: CommodityStock;
}

const BUCKET_LABEL: Record<string, { label: string; className: string }> = {
  mega: { label: "Mega cap", className: "bg-indigo-100 text-indigo-800" },
  large: { label: "Large cap", className: "bg-blue-100 text-blue-800" },
  mid: { label: "Mid cap", className: "bg-emerald-100 text-emerald-800" },
  small: { label: "Small cap", className: "bg-amber-100 text-amber-800" },
  spec: { label: "Speculative", className: "bg-rose-100 text-rose-800" },
};

const EXPOSURE_LABEL: Record<string, string> = {
  producer: "Producer",
  explorer: "Explorer",
  service: "Services",
  royalty: "Royalty",
};

/**
 * Reusable ticker card for the /invest/<sector> hub pages.
 *
 * Deliberately does NOT render a live price. We compute a
 * server-side snapshot once per hour in a future cron, but the
 * card is price-free by default so a stale server render never
 * displays an outdated number next to "current".
 */
export default function AsxTickerCard({ stock }: Props) {
  const bucket = stock.market_cap_bucket
    ? BUCKET_LABEL[stock.market_cap_bucket]
    : null;
  const exposure = stock.primary_exposure
    ? EXPOSURE_LABEL[stock.primary_exposure]
    : null;

  return (
    <article className="border border-slate-200 rounded-xl bg-white p-4 hover:shadow-md transition-shadow">
      <header className="flex items-baseline justify-between gap-2 mb-2">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 leading-tight">
            {stock.ticker}
          </h3>
          <p className="text-xs text-slate-600 mt-0.5">{stock.company_name}</p>
        </div>
        {bucket && (
          <span
            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${bucket.className}`}
          >
            {bucket.label}
          </span>
        )}
      </header>

      {stock.blurb && (
        <p className="text-xs text-slate-700 leading-snug mb-3">
          {stock.blurb}
        </p>
      )}

      <dl className="grid grid-cols-2 gap-y-1.5 text-[11px]">
        {exposure && (
          <>
            <dt className="text-slate-500">Exposure</dt>
            <dd className="font-semibold text-slate-900 text-right">
              {exposure}
            </dd>
          </>
        )}
        {stock.included_in_indices && stock.included_in_indices.length > 0 && (
          <>
            <dt className="text-slate-500">Indices</dt>
            <dd className="font-semibold text-slate-900 text-right">
              {stock.included_in_indices
                .map((i) => i.toUpperCase().replace("ASX", "ASX "))
                .join(", ")}
            </dd>
          </>
        )}
        {stock.foreign_ownership_risk && (
          <>
            <dt className="text-slate-500">Foreign risk</dt>
            <dd className="font-semibold text-slate-900 text-right capitalize">
              {stock.foreign_ownership_risk}
            </dd>
          </>
        )}
      </dl>

      <p className="mt-3 pt-3 border-t border-slate-100 text-[10px] text-slate-400">
        Past performance is not a reliable indicator of future performance.
        Consider your personal circumstances.
      </p>
    </article>
  );
}
