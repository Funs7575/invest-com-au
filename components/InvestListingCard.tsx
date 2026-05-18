import Link from "next/link";
import Image from "next/image";
import type { InvestmentListing } from "@/lib/types";
import { listingUrl } from "@/lib/listing-url";
import { getListingHeroImage } from "@/lib/listing-vertical-images";
import {
  deriveListingKind,
  listingKindMeta,
  formatListingPrice,
  freshnessSignal,
} from "@/lib/listing-kind";
import Icon from "@/components/Icon";
import EnquireButton from "@/components/marketplace/EnquireButton";
import ListingShortlistButton from "@/components/invest/ListingShortlistButton";

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

/**
 * Card variants:
 *   - `grid` (default): full card with hero image (the marketplace grid)
 *   - `list`: horizontal layout, denser, no large hero
 *
 * Card rendering keys off `listing_kind` (with safe derivation fallback)
 * to pick:
 *   - Price label ("Asking" / "Min investment" / "Raising" / "ASX")
 *   - CTA verb ("Enquire" / "Request IM" / "Buy via broker" / "Express interest")
 *   - Kind chip colour + icon
 *
 * The blanket "FIRB" badge that used to fire on every row is now gated
 * to listings where the visitor's intent country matters AND the listing
 * is foreign-investor-relevant — passed via the `showFirbBadge` prop so
 * the listings client can decide once at parent level.
 */
export default function InvestListingCard({
  listing,
  badge,
  variant = "grid",
  showFirbBadge = false,
  matchScore,
}: {
  listing: InvestmentListing;
  badge?: string;
  variant?: "grid" | "list";
  /** Render the blue FIRB badge top-right. Off by default — only on
   *  when the parent surface has a visitor-country signal that makes
   *  the FIRB lens meaningful. */
  showFirbBadge?: boolean;
  /** Optional 0–100 smart-match score. Renders a green pill bottom-left
   *  on the hero when set. (Wired up in Wave 3.) */
  matchScore?: number;
}) {
  const kind = deriveListingKind(listing);
  const meta = listingKindMeta(kind);
  const fresh = freshnessSignal(listing);
  const price = formatListingPrice(listing);
  const location = formatLocation(listing.location_state, listing.location_city);

  const metricEntries = listing.key_metrics
    ? Object.entries(listing.key_metrics).slice(0, 3)
    : [];
  const dbHeroImage = listing.images?.[0];
  const commodityKey =
    listing.sub_category ??
    (listing.key_metrics?.commodity as string | undefined) ??
    null;
  const heroImage = getListingHeroImage(
    listing.vertical,
    listing.id,
    listing.images,
    commodityKey,
  );
  const heroIsSeed = !dbHeroImage;
  const fallbackGradient = VERTICAL_FALLBACK_GRADIENT[listing.vertical] ?? "from-slate-100 to-slate-50";
  const fallbackIcon = VERTICAL_ICON[listing.vertical] ?? "📊";
  const isFeatured = listing.listing_type === "featured" || listing.listing_type === "premium";

  // ── List variant ──────────────────────────────────────────────────
  if (variant === "list") {
    return (
      <Link
        href={listingUrl(listing)}
        className={`group flex gap-4 rounded-xl border bg-white p-3 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${meta.accent.border}`}
      >
        {/* Compact thumb */}
        <div className="relative w-32 h-24 sm:w-40 sm:h-28 rounded-lg overflow-hidden shrink-0 bg-slate-100">
          {heroImage ? (
            <Image
              src={heroImage}
              alt={listing.title}
              fill
              sizes="160px"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className={`absolute inset-0 bg-gradient-to-br ${fallbackGradient} flex items-center justify-center text-3xl opacity-40`}>
              {fallbackIcon}
            </div>
          )}
          {heroImage && heroIsSeed && (
            <div className={`absolute inset-0 bg-gradient-to-br ${fallbackGradient} opacity-30 mix-blend-multiply`} />
          )}
          {/* Top-left kind badge */}
          <span className={`absolute top-1.5 left-1.5 inline-flex items-center gap-1 ${meta.accent.badge} text-[0.55rem] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded shadow-sm`}>
            <Icon name={meta.icon} size={9} />
            {meta.label}
          </span>
          {/* Top-right shortlist button */}
          <div className="absolute top-1 right-1">
            <ListingShortlistButton slug={listing.slug} size="sm" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-start justify-between gap-2">
            <h3 className={`font-bold text-sm md:text-base text-slate-900 line-clamp-2 leading-snug ${meta.accent.text.replace("text-", "group-hover:text-")}`}>
              {listing.title}
            </h3>
            {price && (
              <div className="shrink-0 text-right">
                <div className="text-[0.55rem] text-slate-400 uppercase tracking-wide font-semibold">{price.label}</div>
                <div className="text-sm font-extrabold text-slate-900">{price.value}</div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 flex-wrap">
            {location && (
              <span className="inline-flex items-center gap-0.5">
                <Icon name="map-pin" size={11} className="text-slate-400" />
                {location}
              </span>
            )}
            {listing.industry && <span>· {listing.industry}</span>}
            {fresh === "new_this_week" && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[0.55rem] font-bold uppercase tracking-wide">
                New
              </span>
            )}
            {fresh === "closing_soon" && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[0.55rem] font-bold uppercase tracking-wide">
                Closing soon
              </span>
            )}
            {isFeatured && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[0.55rem] font-bold uppercase tracking-wide">
                ★ Featured
              </span>
            )}
            {matchScore != null && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[0.55rem] font-bold uppercase tracking-wide">
                {matchScore}% match
              </span>
            )}
          </div>
          {metricEntries.length > 0 && (
            <div className="mt-auto pt-2 flex gap-3 text-[0.62rem] text-slate-600">
              {metricEntries.map(([k, v]) => (
                <span key={k}>
                  <span className="text-slate-400 capitalize">{k.replace(/_/g, " ")}: </span>
                  <span className="font-semibold text-slate-800">{formatKeyMetricValue(v)}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </Link>
    );
  }

  // ── Grid variant (default) ────────────────────────────────────────
  return (
    <Link
      href={listingUrl(listing)}
      className={`group relative block overflow-hidden rounded-2xl border bg-white shadow-sm hover:shadow-xl hover:border-slate-300 transition-all duration-300 hover:-translate-y-0.5 ${meta.accent.border} ${
        isFeatured ? "ring-1 ring-amber-200/80 shadow-amber-50" : ""
      }`}
    >
      {/* Hero image */}
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
        {heroImage ? (
          <>
            <Image
              src={heroImage}
              alt={listing.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
            {heroIsSeed && (
              <div
                aria-hidden
                className={`absolute inset-0 bg-gradient-to-br ${fallbackGradient} opacity-30 mix-blend-multiply pointer-events-none`}
              />
            )}
          </>
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${fallbackGradient} flex items-center justify-center`}>
            <div className="text-6xl opacity-40 group-hover:scale-110 transition-transform duration-500">
              {fallbackIcon}
            </div>
          </div>
        )}

        {/* Top-left badges: kind + featured + provided badge */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 max-w-[70%]">
          <span className={`inline-flex items-center gap-1 ${meta.accent.badge} text-[0.62rem] font-extrabold uppercase tracking-wider px-2 py-1 rounded-md shadow-sm`}>
            <Icon name={meta.icon} size={10} />
            {meta.label}
          </span>
          {isFeatured && (
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

        {/* Top-right: shortlist bookmark + compliance + freshness */}
        <div className="absolute top-3 right-3 flex flex-wrap gap-1.5 justify-end items-start max-w-[55%]">
          <ListingShortlistButton slug={listing.slug} />
          {showFirbBadge && listing.firb_eligible && (
            <span className="bg-blue-600 text-white text-[0.6rem] font-extrabold uppercase tracking-wider px-2 py-1 rounded-md shadow-sm">
              FIRB
            </span>
          )}
          {listing.siv_complying && (
            <span className="bg-emerald-600 text-white text-[0.6rem] font-extrabold uppercase tracking-wider px-2 py-1 rounded-md shadow-sm">
              SIV
            </span>
          )}
          {fresh === "new_this_week" && (
            <span className="bg-emerald-500 text-white text-[0.6rem] font-extrabold uppercase tracking-wider px-2 py-1 rounded-md shadow-sm">
              New
            </span>
          )}
          {fresh === "closing_soon" && (
            <span className="bg-rose-500 text-white text-[0.6rem] font-extrabold uppercase tracking-wider px-2 py-1 rounded-md shadow-sm">
              Closing
            </span>
          )}
        </div>

        {/* Bottom price overlay */}
        {price && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3">
            <div className="flex items-end justify-between gap-2">
              <div>
                <div className="text-white text-[0.65rem] font-semibold opacity-80 uppercase tracking-wide">{price.label}</div>
                <div className="text-white text-lg font-extrabold leading-tight">{price.value}</div>
              </div>
              {matchScore != null && (
                <span className="bg-emerald-500 text-white text-[0.6rem] font-extrabold uppercase tracking-wider px-2 py-1 rounded-md shadow-sm">
                  {matchScore}% match
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className={`font-bold text-base text-slate-900 transition-colors line-clamp-2 mb-1.5 leading-snug ${meta.accent.text.replace("text-", "group-hover:text-")}`}>
          {listing.title}
        </h3>

        {location && (
          <p className="flex items-center gap-1 text-xs text-slate-500 mb-3">
            <Icon name="map-pin" size={11} className="text-slate-400" />
            {location}
          </p>
        )}

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

        {/* CTA row — kind-aware verb. Listed securities use an external
            "Buy via broker" link to /compare instead of the Enquire flow. */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
          {meta.externalCta ? (
            <span className={`inline-flex items-center gap-1 text-xs font-bold ${meta.accent.text}`}>
              <Icon name="external-link" size={12} />
              {meta.ctaLabel}
            </span>
          ) : (
            <EnquireButton
              listingId={listing.id}
              listingTitle={listing.title}
              buttonCls="bg-amber-500 hover:bg-amber-600 text-white"
            />
          )}
          <span className={`flex-1 inline-flex items-center justify-end gap-1 text-xs font-bold ${meta.accent.text} group-hover:gap-2 transition-all`}>
            View Details
            <Icon name="chevron-right" size={12} />
          </span>
        </div>
      </div>
    </Link>
  );
}
