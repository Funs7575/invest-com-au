import Image from "next/image";
import type { CommodityStock } from "@/lib/commodities";
import { getSectorThumbImage } from "@/lib/listing-vertical-images";

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

  const thumb = getSectorThumbImage(stock.sector_slug, stock.ticker);

  return (
    <article className="border border-slate-200 rounded-xl bg-white overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      {/* Sector-themed thumbnail. Deterministic on ticker so each card
          shows a stable image. Aspect ratio is shorter than the listing
          card's 16:10 because ticker cards are denser. */}
      <div className="relative aspect-[16/7] bg-slate-100">
        <Image
          src={thumb}
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
          className="object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
        <div className="absolute top-2 right-2">
          {bucket && (
            <span
              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 shadow-sm ${bucket.className}`}
            >
              {bucket.label}
            </span>
          )}
        </div>
        <div className="absolute bottom-2 left-3 right-3 text-white">
          <h3 className="text-base font-extrabold leading-tight drop-shadow">
            {stock.ticker}
          </h3>
          <p className="text-[11px] opacity-95 leading-snug line-clamp-1 drop-shadow">
            {stock.company_name}
          </p>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col">

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
      </div>
    </article>
  );
}
