import Link from "next/link";
import Icon from "@/components/Icon";
import { formatAudCompact } from "@/lib/listing-kind";
import { pricePerUnit } from "@/lib/listings/vertical-metrics";
import { listingUrl } from "@/lib/listing-url";
import type { RecentlySoldRow } from "@/lib/listings/sold-archive";

/**
 * "Recently sold" strip (idea #25) — realised sales from the platform's
 * own archive, under the comparables module. The Zillow pattern: nothing
 * makes an asking price credible like what the market actually paid.
 * Hidden entirely until the category has sold rows.
 */
export default function LotRecentlySold({
  rows,
  categoryLabel,
}: {
  rows: RecentlySoldRow[];
  categoryLabel: string;
}) {
  if (rows.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-1">
        <Icon name="check-circle" size={16} className="text-emerald-600" />
        <h2 className="text-base font-bold text-slate-900">
          Recently sold — {categoryLabel}
        </h2>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Realised sales recorded on Invest.com.au. Past sales are not an
        indicator of future prices.
      </p>

      <ul className="divide-y divide-slate-100">
        {rows.map((row) => {
          const when = row.sold_at
            ? new Date(row.sold_at).toLocaleDateString("en-AU", {
                month: "short",
                year: "numeric",
              })
            : null;
          const perUnit = row.sold_price_cents
            ? pricePerUnit({
                ...row,
                asking_price_cents: row.sold_price_cents,
              })
            : null;
          const location = [row.location_city, row.location_state]
            .filter(Boolean)
            .join(", ");
          return (
            <li key={row.id} className="flex items-baseline justify-between gap-4 py-2.5">
              <div className="min-w-0">
                <Link
                  href={listingUrl(row)}
                  className="text-sm font-semibold text-slate-800 hover:text-amber-700 truncate block"
                >
                  {row.title}
                </Link>
                <p className="text-xs text-slate-500">
                  {[location, when ? `Sold ${when}` : "Sold"].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-slate-900 whitespace-nowrap">
                  {row.sold_price_cents ? formatAudCompact(row.sold_price_cents) : "Undisclosed"}
                </p>
                {perUnit && (
                  <p className="text-xs font-semibold text-emerald-800">≈ {perUnit.value}</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
