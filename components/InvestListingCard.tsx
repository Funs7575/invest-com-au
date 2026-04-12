import Link from "next/link";
import type { InvestmentListing } from "@/lib/types";

function formatLocation(state?: string, city?: string): string | null {
  if (city && state) return `${city}, ${state}`;
  return state || city || null;
}

function formatKeyMetricValue(value: string | number | boolean): string {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export default function InvestListingCard({
  listing,
  badge,
}: {
  listing: InvestmentListing;
  badge?: string;
}) {
  const location = formatLocation(listing.location_state, listing.location_city);
  const metricEntries = listing.key_metrics
    ? Object.entries(listing.key_metrics).slice(0, 3)
    : [];

  return (
    <Link
      href={`/invest/listing/${listing.slug}`}
      className="group relative block rounded-xl border border-slate-200 bg-white transition-all duration-200 hover:shadow-lg hover:scale-[1.01]"
    >
      {/* Badge */}
      {badge && (
        <div className="px-3 pt-2.5 pb-0 text-[0.62rem] font-extrabold uppercase tracking-wide text-slate-700">
          {badge}
        </div>
      )}

      <div className="p-3">
        {/* Row 1: Title + Price */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-sm text-slate-900 group-hover:text-slate-700 transition-colors truncate">
              {listing.title}
            </h3>
            {location && (
              <p className="text-[0.65rem] font-semibold text-slate-500 mt-0.5 truncate">
                {location}
              </p>
            )}
          </div>
          {listing.price_display && (
            <span className="shrink-0 text-sm font-bold text-slate-900">
              {listing.price_display}
            </span>
          )}
        </div>

        {/* Row 2: Industry + Sub-category + Compliance badges */}
        <div className="flex flex-wrap items-center gap-1 mb-1.5">
          {listing.industry && (
            <span className="text-[0.6rem] px-1.5 py-0.5 bg-slate-50 rounded font-semibold text-slate-700">
              {listing.industry}
            </span>
          )}
          {listing.sub_category && (
            <span className="text-[0.6rem] px-1.5 py-0.5 bg-slate-50 rounded font-semibold text-slate-700">
              {listing.sub_category}
            </span>
          )}
          {listing.firb_eligible && (
            <span className="text-[0.6rem] px-1.5 py-0.5 bg-emerald-50 rounded font-bold text-emerald-700">
              FIRB Eligible
            </span>
          )}
          {listing.siv_complying && (
            <span className="text-[0.6rem] px-1.5 py-0.5 bg-blue-50 rounded font-bold text-blue-700">
              SIV Complying
            </span>
          )}
        </div>

        {/* Row 3: Key metrics */}
        {metricEntries.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 mb-2">
            {metricEntries.map(([key, value]) => (
              <span
                key={key}
                className="text-[0.6rem] px-1.5 py-0.5 bg-slate-50 rounded font-semibold text-slate-600"
              >
                {key}: {formatKeyMetricValue(value)}
              </span>
            ))}
          </div>
        )}

        {/* Row 4: CTA */}
        <div className="flex items-center justify-end">
          <span className="px-3 py-1.5 text-[0.69rem] font-bold rounded-lg bg-slate-900 text-white group-hover:bg-slate-800 transition-colors">
            View Details
          </span>
        </div>
      </div>
    </Link>
  );
}
