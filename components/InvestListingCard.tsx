import Link from "next/link";
import Image from "next/image";
import type { InvestmentListing, ListingKind } from "@/lib/types";
import { listingUrl } from "@/lib/listing-url";
import { getListingHeroImage } from "@/lib/listing-vertical-images";
import {
  deriveListingKind,
  listingKindMeta,
  formatListingPrice,
  freshnessSignal,
} from "@/lib/listing-kind";
import { humanizeTitle, listingDisplayMetrics, listingHeadlineStat } from "@/lib/listing-format";
import Icon from "@/components/Icon";
import EnquireButton from "@/components/marketplace/EnquireButton";
import ListingShortlistButton from "@/components/invest/ListingShortlistButton";
import MatchScorePill from "@/components/invest/MatchScorePill";
import ListingClaimLink from "@/components/invest/ListingClaimLink";

function formatLocation(state?: string, city?: string): string | null {
  if (city && state) return `${city}, ${state}`;
  return state || city || null;
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
 * Per-kind hue for the 3px colour strip across the top of the card hero
 * (the marketplace "vstrip" signature from the v2 design language). Mirrors
 * the hue of `meta.accent` so the strip + kind badge read as one system.
 */
const KIND_STRIP: Record<ListingKind, string> = {
  for_sale_business: "bg-blue-600",
  for_sale_asset: "bg-slate-600",
  equity_raise: "bg-indigo-600",
  project_equity: "bg-amber-600",
  royalty: "bg-rose-600",
  fund: "bg-violet-600",
  physical_asset: "bg-fuchsia-600",
  listed_security: "bg-sky-600",
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
 * Visual language: v2 "confident fintech" — coral action accent, deep-ink
 * titles, sand-neutral surfaces, big tabular price (`.iv2-bignum`), pill
 * trust chips. Tokens live in `globals.css` (`--color-coral-*`, `--color-ink-*`).
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
  matchReasons,
  advisorOptInCount = 0,
  showClaimBadge = false,
}: {
  listing: InvestmentListing;
  badge?: string;
  variant?: "grid" | "list";
  /** Render the blue FIRB badge top-right. Off by default — only on
   *  when the parent surface has a visitor-country signal that makes
   *  the FIRB lens meaningful. */
  showFirbBadge?: boolean;
  /** Optional 0–100 smart-match score from `computeMatchScore`. Renders
   *  a green pill bottom-left on the hero when set. Computed server-side
   *  per logged-in investor profile. */
  matchScore?: number | null;
  /** Factual matched-criteria lines from `computeMatchBreakdown` — when
   *  present the pill opens a why-this-score sheet (Northstar D11). */
  matchReasons?: string[] | null;
  /** Number of distinct advisor types that have opted in to support
   *  this listing. Renders a small "X advisors" pill on the card when > 0. */
  advisorOptInCount?: number;
  /** When true, render a small "Are you the owner?" link on the card.
   *  Set on listings that have no approved listing_claims row — gives
   *  fund / project sellers a self-service entry into the claim flow. */
  showClaimBadge?: boolean;
}) {
  const kind = deriveListingKind(listing);
  const meta = listingKindMeta(kind);
  const fresh = freshnessSignal(listing);
  const price = formatListingPrice(listing);
  const headline = listingHeadlineStat(listing);
  const location = formatLocation(listing.location_state, listing.location_city);
  const stripColor = KIND_STRIP[kind];

  const displayMetrics = listingDisplayMetrics(listing.key_metrics);
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

  // Reusable kind badge (white pill over the hero image).
  const kindBadge = (
    <span className="iv2-pill bg-white/95 text-ink-800 shadow-sm backdrop-blur-sm" style={{ fontSize: "10px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
      <Icon name={meta.icon} size={11} />
      {meta.label}
    </span>
  );

  // Inline metric line ("3 bedrooms · 2025 build year · ✓ SMSF eligible").
  const metricLine = displayMetrics.length > 0 && (
    <p className="text-xs leading-relaxed text-slate-600">
      {displayMetrics.map((m, i) => (
        <span key={m.key}>
          {i > 0 && <span className="text-slate-300"> · </span>}
          {m.bool ? (
            <span className="font-semibold text-ink-700">
              <Icon name="check" size={11} className="mr-0.5 inline align-[-1px] text-emerald-600" />
              {m.label}
            </span>
          ) : (
            <>
              <span className="font-bold text-ink-800">{m.value}</span>{" "}
              <span className="text-slate-500">{m.label}</span>
            </>
          )}
        </span>
      ))}
    </p>
  );

  // Trust chips (Featured / FIRB / SIV) — shared by both variants.
  const trustChips = (
    <>
      {isFeatured && (
        <span className="iv2-pill border border-coral-100 bg-coral-50 text-coral-700" style={{ fontSize: "10.5px" }}>
          <Icon name="star" size={10} />
          Featured
        </span>
      )}
      {showFirbBadge && listing.firb_eligible && (
        <span className="iv2-pill border border-blue-100 bg-blue-50 text-blue-700" style={{ fontSize: "10.5px" }}>
          FIRB eligible
        </span>
      )}
      {listing.siv_complying && (
        <span className="iv2-pill border border-emerald-100 bg-emerald-50 text-emerald-700" style={{ fontSize: "10.5px" }}>
          SIV-complying
        </span>
      )}
    </>
  );

  // ── List variant ──────────────────────────────────────────────────
  if (variant === "list") {
    return (
      <Link
        href={listingUrl(listing)}
        className={`group flex gap-4 rounded-[14px] border bg-white p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-ink-200 hover:shadow-lg ${
          isFeatured ? "border-coral-200 ring-1 ring-coral-100" : "border-slate-200"
        }`}
      >
        {/* Compact thumb */}
        <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-lg bg-ink-900 sm:h-28 sm:w-40">
          {heroImage ? (
            <Image
              src={heroImage}
              alt={listing.title}
              fill
              sizes="160px"
              className="object-cover opacity-95 transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className={`absolute inset-0 bg-gradient-to-br ${fallbackGradient} flex items-center justify-center text-3xl opacity-50`}>
              {fallbackIcon}
            </div>
          )}
          {heroImage && heroIsSeed && (
            <div className={`absolute inset-0 bg-gradient-to-br ${fallbackGradient} opacity-30 mix-blend-multiply`} />
          )}
          <div className={`absolute inset-x-0 top-0 h-[3px] ${stripColor}`} />
          {/* Top-left kind badge */}
          <span className="absolute left-1.5 top-1.5">{kindBadge}</span>
          {matchScore != null && <MatchScorePill score={matchScore} reasons={matchReasons} />}
          {/* Top-right shortlist button */}
          <div className="absolute right-1 top-1">
            <ListingShortlistButton slug={listing.slug} size="sm" />
          </div>
        </div>

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h3 className="line-clamp-2 text-sm font-bold leading-snug text-ink-800 group-hover:text-coral-700 md:text-base">
            {listing.title}
          </h3>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
            {location && (
              <span className="inline-flex items-center gap-0.5">
                <Icon name="map-pin" size={11} className="text-slate-500" />
                {location}
              </span>
            )}
            {listing.industry && <span>· {listing.industry}</span>}
            {fresh === "new_this_week" && (
              <span className="iv2-pill bg-emerald-50 text-emerald-700" style={{ fontSize: "10px" }}>New this week</span>
            )}
            {fresh === "closing_soon" && (
              <span className="iv2-pill bg-rose-50 text-rose-600" style={{ fontSize: "10px" }}>Closing soon</span>
            )}
          </div>
          {metricLine}
          <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
            {trustChips}
            {advisorOptInCount > 0 && (
              <span className="iv2-pill border border-emerald-200 bg-emerald-50 text-emerald-700" style={{ fontSize: "10px" }}>
                <Icon name="user-check" size={10} />
                {advisorOptInCount} can assess
              </span>
            )}
          </div>
        </div>

        {/* Right rail — price + CTA */}
        <div className="flex shrink-0 flex-col items-end justify-between gap-2 text-right">
          {price ? (
            <div>
              <div className="iv2-mini">{price.label}</div>
              <div className="iv2-bignum whitespace-nowrap text-xl text-ink-900">{price.value}</div>
              {headline && (
                <div
                  className={`mt-0.5 text-xs font-semibold ${
                    headline.tone === "positive" ? "text-emerald-600" : "text-slate-500"
                  }`}
                >
                  {headline.label} <span className="tabular-nums">{headline.value}</span>
                </div>
              )}
            </div>
          ) : (
            <span />
          )}
          <span className="inline-flex items-center gap-1 rounded-lg bg-coral-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors group-hover:bg-coral-700">
            View
            <Icon name="chevron-right" size={12} />
          </span>
        </div>
      </Link>
    );
  }

  // ── Grid variant (default) ────────────────────────────────────────
  return (
    <Link
      href={listingUrl(listing)}
      className={`group relative flex h-full flex-col overflow-hidden rounded-[14px] border bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl ${
        isFeatured ? "border-coral-200 ring-1 ring-coral-100" : "border-slate-200 hover:border-ink-200"
      }`}
    >
      {/* Hero image */}
      <div className="relative aspect-[16/10] overflow-hidden bg-ink-900">
        {heroImage ? (
          <>
            <Image
              src={heroImage}
              alt={listing.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
              className="object-cover opacity-95 transition-transform duration-500 group-hover:scale-105"
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
            <div className="text-6xl opacity-40 transition-transform duration-500 group-hover:scale-110">
              {fallbackIcon}
            </div>
          </div>
        )}

        {/* Gradient scrim so the location/strip read over any photo */}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink-900/65 via-transparent to-transparent" />

        {/* Category colour strip */}
        <div className={`absolute inset-x-0 top-0 h-[3px] ${stripColor}`} />

        {/* Top-left badges: kind + featured + provided badge */}
        <div className="absolute left-3 top-3 flex max-w-[72%] flex-wrap items-center gap-1.5">
          {kindBadge}
          {badge && (
            <span className="iv2-pill bg-white/95 text-ink-800 shadow-sm backdrop-blur-sm" style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {badge}
            </span>
          )}
        </div>

        {/* Top-right: shortlist bookmark + match */}
        <div className="absolute right-3 top-3 flex flex-col items-end gap-1.5">
          <ListingShortlistButton slug={listing.slug} />
          {matchScore != null && (
            <span className="iv2-pill bg-emerald-500 text-white shadow-sm" style={{ fontSize: "10px" }}>
              {matchScore}% match
            </span>
          )}
        </div>

        {/* Bottom-left: location */}
        {location && (
          <div className="absolute bottom-2.5 left-3 flex items-center gap-1 text-[11px] font-semibold text-white drop-shadow">
            <Icon name="map-pin" size={11} />
            {location}
          </div>
        )}
        {/* Bottom-right: freshness flag */}
        {fresh === "new_this_week" && (
          <span className="iv2-pill absolute bottom-2.5 right-3 bg-emerald-500 text-white shadow-sm" style={{ fontSize: "10px" }}>New</span>
        )}
        {fresh === "closing_soon" && (
          <span className="iv2-pill absolute bottom-2.5 right-3 bg-rose-500 text-white shadow-sm" style={{ fontSize: "10px" }}>Closing soon</span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-ink-800 transition-colors group-hover:text-coral-700">
          {listing.title}
        </h3>

        {(listing.industry || listing.sub_category) && (
          <p className="-mt-1 text-xs text-slate-500">
            {[humanizeTitle(listing.industry), humanizeTitle(listing.sub_category)].filter(Boolean).join(" · ")}
          </p>
        )}

        {/* Price + headline return stat — two distinct slots, never concatenated */}
        {price && (
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <div className="iv2-mini">{price.label}</div>
              <div
                className={`iv2-bignum truncate text-ink-900 ${
                  price.value.length > 18
                    ? "text-sm"
                    : price.value.length > 13
                      ? "text-base"
                      : price.value.length > 9
                        ? "text-xl"
                        : "text-2xl"
                }`}
              >
                {price.value}
              </div>
            </div>
            {headline && (
              <div className="shrink-0 text-right">
                <div className="iv2-mini">{headline.label}</div>
                <div
                  className={`iv2-bignum whitespace-nowrap text-xl ${
                    headline.tone === "positive" ? "text-emerald-600" : "text-ink-700"
                  }`}
                >
                  {headline.value}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Key metrics line */}
        {metricLine}

        {/* Trust chips */}
        <div className="flex flex-wrap items-center gap-1.5">{trustChips}</div>

        {/* Advisor opt-in pill — "X advisors can assess this" */}
        {advisorOptInCount > 0 && (
          <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[0.62rem] font-semibold text-emerald-700">
            <Icon name="user-check" size={11} />
            {advisorOptInCount} advisor{advisorOptInCount !== 1 ? "s" : ""} can assess this
          </div>
        )}

        {/* Claim-your-listing prompt */}
        {showClaimBadge && (
          <ListingClaimLink
            slug={listing.slug}
            label={kind === "fund" ? "fund manager" : kind === "physical_asset" ? "seller" : "owner"}
          />
        )}

        {/* CTA row — kind-aware verb. Listed securities route externally. */}
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
          {meta.externalCta ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink-500">
              <Icon name="external-link" size={12} />
              {meta.ctaLabel}
            </span>
          ) : (
            <EnquireButton
              listingId={listing.id}
              listingTitle={listing.title}
              buttonCls="bg-coral-600 hover:bg-coral-700 text-white"
            />
          )}
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-coral-600 transition-all group-hover:gap-1.5">
            View
            <Icon name="chevron-right" size={13} />
          </span>
        </div>
      </div>
    </Link>
  );
}
