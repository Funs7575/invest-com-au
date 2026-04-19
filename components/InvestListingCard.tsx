import Link from "next/link";
import Image from "next/image";
import type { InvestmentListing } from "@/lib/types";
import { listingUrl } from "@/lib/listing-url";
import EnquireButton from "@/components/marketplace/EnquireButton";

function formatLocation(state?: string, city?: string): string | null {
  if (city && state) return `${city}, ${state}`;
  return state || city || null;
}

function formatKeyMetricValue(value: string | number | boolean): string {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

/**
 * Vertical → fallback gradient when listing has no images.
 * Each category gets a distinct, warm gradient so cards still look polished.
 */
const VERTICAL_FALLBACK_GRADIENT: Record<string, string> = {
  business: "from-blue-100 via-indigo-50 to-blue-50",
  commercial_property: "from-slate-200 via-slate-100 to-slate-50",
  energy: "from-emerald-100 via-emerald-50 to-green-50",
  farmland: "from-green-100 via-lime-50 to-amber-50",
  franchise: "from-purple-100 via-violet-50 to-pink-50",
  fund: "from-violet-100 via-purple-50 to-indigo-50",
  mining: "from-amber-100 via-yellow-50 to-orange-50",
  startup: "from-indigo-100 via-blue-50 to-cyan-50",
};

/**
 * Vertical → emoji icon for fallback when no images available.
 */
const VERTICAL_ICON: Record<string, string> = {
  business: "🏢",
  commercial_property: "🏬",
  energy: "⚡",
  farmland: "🌾",
  franchise: "🍔",
  fund: "📈",
  mining: "⛏️",
  startup: "🚀",
};

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
  const heroImage = listing.images?.[0];
  const fallbackGradient = VERTICAL_FALLBACK_GRADIENT[listing.vertical] ?? "from-slate-100 to-slate-50";
  const fallbackIcon = VERTICAL_ICON[listing.vertical] ?? "📊";

  return (
    <Link
      href={listingUrl(listing)}
      className="group relative block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-xl hover:border-slate-300 transition-all duration-300 hover:-translate-y-0.5"
    >
      {/* Hero image / fallback */}
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
        {heroImage ? (
          <Image
            src={heroImage}
            alt={listing.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${fallbackGradient} flex items-center justify-center`}>
            <div className="text-6xl opacity-40 group-hover:scale-110 transition-transform duration-500">
              {fallbackIcon}
            </div>
          </div>
        )}

        {/* Top-left badges (Featured / pick) */}
        {(badge || listing.listing_type === "featured") && (
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
            {listing.listing_type === "featured" && (
              <span className="bg-amber-500 text-slate-900 text-[0.62rem] font-extrabold uppercase tracking-wider px-2 py-1 rounded-md shadow-sm">
                ★ Featured
              </span>
            )}
            {badge && (
              <span className="bg-white/95 backdrop-blur text-slate-800 text-[0.62rem] font-extrabold uppercase tracking-wider px-2 py-1 rounded-md shadow-sm">
                {badge}
              </span>
            )}
          </div>
        )}

        {/* Top-right compliance badges */}
        {(listing.firb_eligible || listing.siv_complying) && (
          <div className="absolute top-3 right-3 flex gap-1.5">
            {listing.firb_eligible && (
              <span className="bg-blue-600 text-white text-[0.6rem] font-extrabold uppercase tracking-wider px-2 py-1 rounded-md shadow-sm">
                FIRB
              </span>
            )}
            {listing.siv_complying && (
              <span className="bg-emerald-600 text-white text-[0.6rem] font-extrabold uppercase tracking-wider px-2 py-1 rounded-md shadow-sm">
                SIV
              </span>
            )}
          </div>
        )}

        {/* Bottom price overlay */}
        {listing.price_display && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-3">
            <div className="text-white text-xs font-semibold opacity-80 uppercase tracking-wide">Asking</div>
            <div className="text-white text-lg font-extrabold">{listing.price_display}</div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title */}
        <h3 className="font-bold text-base text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-2 mb-1.5 leading-snug">
          {listing.title}
        </h3>

        {/* Location */}
        {location && (
          <p className="flex items-center gap-1 text-xs text-slate-500 mb-3">
            <svg className="w-3 h-3 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            {location}
          </p>
        )}

        {/* Industry / sub-category pills */}
        {(listing.industry || listing.sub_category) && (
          <div className="flex flex-wrap items-center gap-1 mb-3">
            {listing.industry && (
              <span className="text-[0.62rem] px-2 py-0.5 bg-slate-100 rounded-full font-semibold text-slate-600">
                {listing.industry}
              </span>
            )}
            {listing.sub_category && (
              <span className="text-[0.62rem] px-2 py-0.5 bg-slate-100 rounded-full font-semibold text-slate-600 capitalize">
                {listing.sub_category.replace(/_/g, " ")}
              </span>
            )}
          </div>
        )}

        {/* Key metrics row */}
        {metricEntries.length > 0 && (
          <div className="grid grid-cols-3 gap-2 pt-3 mt-2 border-t border-slate-100">
            {metricEntries.map(([key, value]) => (
              <div key={key} className="text-center">
                <div className="text-[0.6rem] text-slate-400 uppercase tracking-wide font-medium truncate">
                  {key.replace(/_/g, " ")}
                </div>
                <div className="text-xs font-bold text-slate-900 truncate">
                  {formatKeyMetricValue(value)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CTA row — Enquire button is a sibling <button> but we rely
            on event.preventDefault + stopPropagation inside
            EnquireButton to prevent the outer <Link> from firing. */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
          <EnquireButton
            listingId={listing.id}
            listingTitle={listing.title}
            buttonCls="bg-amber-500 hover:bg-amber-600 text-white"
          />
          <span className="flex-1 inline-flex items-center justify-end gap-1 text-xs font-bold text-emerald-600 group-hover:text-emerald-700 group-hover:gap-2 transition-all">
            View Details
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}
