import Link from "next/link";
import { breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import Icon from "@/components/Icon";
import ListingImageGallery from "@/components/ListingImageGallery";
import ListingCard, { type InvestmentListing } from "@/components/ListingCard";
import ListingEnquiryForm from "@/components/ListingEnquiryForm";
import ListingDecisionTools from "@/components/invest/ListingDecisionTools";
import ListingSchemaScripts from "@/components/ListingSchemaScripts";
import LotSaveButton from "@/components/invest/lot/LotSaveButton";
import LotStickyActions from "@/components/invest/lot/LotStickyActions";
import LotFieldGuide from "@/components/invest/lot/LotFieldGuide";
import LotPaperTrail from "@/components/invest/lot/LotPaperTrail";
import LotTransparency from "@/components/invest/lot/LotTransparency";
import LotHoldingCosts from "@/components/invest/lot/LotHoldingCosts";
import LotLiquidityExit from "@/components/invest/lot/LotLiquidityExit";
import LotComparables from "@/components/invest/lot/LotComparables";
import LotListerCard from "@/components/invest/lot/LotListerCard";
import { buildLotProfile } from "@/lib/listings/lot-profile";
import LotRecentlySold from "@/components/invest/lot/LotRecentlySold";
import LotMedia from "@/components/invest/lot/LotMedia";
import LotDueDiligence from "@/components/invest/lot/LotDueDiligence";
import { fetchSoldComparables, mergeComparables, fetchRecentlySold } from "@/lib/listings/sold-archive";
import { pricePerUnit } from "@/lib/listings/vertical-metrics";
import { intelForCategory } from "@/lib/listings/vertical-intel";
import { assessLotTransparency } from "@/lib/listings/lot-transparency";
import {
  deriveListingKind,
  listingKindMeta,
  formatListingPrice,
  formatAudCompact,
  freshnessSignal,
  type FreshnessSignal,
} from "@/lib/listing-kind";
import { humanizeTitle, formatMetricValue } from "@/lib/listing-format";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

/**
 * Shared single-listing detail view — the "lot page".
 *
 * One canonical surface for every `/invest/<category>/listings/<slug>`
 * detail render (bespoke category routes and the generic
 * `[slug]/listings/[subcategory]` route both compose it). Per-vertical
 * flavour — headings, enquiry nouns, FIRB notes, field-guide content —
 * comes from `lib/listings/vertical-intel.ts`, NOT from forked JSX; the
 * structured catalogue sections (paper trail, costs, liquidity, comps,
 * transparency) come from `lib/listings/lot-profile.ts` +
 * `lot-transparency.ts` and degrade gracefully on sparse rows.
 *
 * Design + compliance rationale: docs/plans/LISTINGS_LOT_EXPERIENCE.md.
 */

const HERO_SENTINEL_ID = "lot-hero-sentinel";

const FRESHNESS_CHIP: Record<NonNullable<FreshnessSignal>, { label: string; className: string }> = {
  new_this_week: { label: "New this week", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  new_this_month: { label: "New this month", className: "bg-sky-50 text-sky-700 border border-sky-200" },
  closing_soon: { label: "Closing soon", className: "bg-rose-50 text-rose-700 border border-rose-200" },
};

export interface ListingDetailViewProps {
  listing: InvestmentListing;
  relatedListings: InvestmentListing[];
  /** URL category slug (e.g. "funds") for breadcrumbs / links. */
  categorySlug: string;
  /** Display label (e.g. "Managed Funds") for copy. */
  categoryLabel: string;
}

export default async function ListingDetailView({
  listing: l,
  relatedListings,
  categorySlug,
  categoryLabel,
}: ListingDetailViewProps) {
  const km = (l.key_metrics ?? {}) as Record<string, unknown>;
  const location = [l.location_city, l.location_state].filter(Boolean).join(", ");
  const listingsHref = `/invest/${categorySlug}/listings`;

  const intel = intelForCategory(categorySlug);
  const profile = buildLotProfile(km);
  // Platform-realised sales lead the comparables module — first-party comps
  // from the sold archive, ahead of seller-stated history. Fails soft to
  // seller comps only until the archive migration is applied.
  const [soldComps, recentlySold] = await Promise.all([
    fetchSoldComparables(l.vertical, { excludeSlug: l.slug, categorySlug }),
    fetchRecentlySold(l.vertical, { excludeSlug: l.slug, categorySlug }),
  ]);
  const profileWithComps = {
    ...profile,
    comparables: mergeComparables(soldComps, profile.comparables),
  };
  const transparency = assessLotTransparency(l, profile);
  const kind = deriveListingKind(l);
  const kindMeta = listingKindMeta(kind);
  const price = formatListingPrice(l);
  const perUnit = pricePerUnit(l);
  const fresh = freshnessSignal({
    created_at: l.created_at ?? "",
    expires_at: (l as { expires_at?: string }).expires_at,
  });
  const freshChip = fresh ? FRESHNESS_CHIP[fresh] : null;

  const highlightKey = intel.highlightMetricKeys.find(
    (key) => km[key] != null && km[key] !== "",
  );
  // Top-level annual_profit_cents wins the price-card highlight slot (the
  // bespoke business/franchise pages always led with it); otherwise fall
  // back to the vertical's preferred key_metrics highlight.
  const highlight = l.annual_profit_cents
    ? { label: "Annual Net Profit", value: formatAudCompact(l.annual_profit_cents) }
    : highlightKey
      ? { label: humanizeTitle(highlightKey), value: formatMetricValue(highlightKey, km[highlightKey]) }
      : null;

  // Financials stored as top-level columns (not key_metrics) — the facts
  // grid is built from key_metrics, so fold these in or they vanish.
  // Profit is excluded here because it always owns the highlight slot.
  const facts = l.annual_revenue_cents
    ? [
        {
          key: "annual_revenue_cents",
          label: "Annual Revenue",
          value: formatAudCompact(l.annual_revenue_cents),
        },
        ...profile.facts,
      ]
    : profile.facts;

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: categoryLabel, url: `${SITE_URL}/invest/${categorySlug}` },
    { name: "Opportunities", url: `${SITE_URL}${listingsHref}` },
    { name: l.title },
  ]);

  return (
    <div className="pb-16 md:pb-0">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <ListingSchemaScripts listing={l} vertical={categorySlug} />

      {/* Compact header — breadcrumb + badges + title + save, gallery near the fold. */}
      <section className="bg-white border-b border-slate-100 py-3 md:py-4">
        <div className="container-custom">
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-2" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-slate-900 transition-colors">Home</Link>
            <Icon name="chevron-right" size={12} className="text-slate-300" />
            <Link href={listingsHref} className="hover:text-slate-900 transition-colors">{categoryLabel} Opportunities</Link>
            <Icon name="chevron-right" size={12} className="text-slate-300" />
            <span className="text-slate-900 font-medium truncate max-w-40">{l.title}</span>
          </nav>

          <div className="flex flex-wrap gap-2 mb-2">
            {l.listing_type === "featured" && (
              <span className="bg-amber-500 text-slate-900 text-xs font-bold px-2.5 py-0.5 rounded-full">Featured</span>
            )}
            {l.listing_type === "premium" && (
              <span className="bg-yellow-400 text-slate-900 text-xs font-bold px-2.5 py-0.5 rounded-full">Premium</span>
            )}
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${kindMeta.accent.badgeSubtle}`}>
              {kindMeta.label}
            </span>
            {freshChip && (
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${freshChip.className}`}>
                {freshChip.label}
              </span>
            )}
            {l.firb_eligible && (
              <span className="bg-blue-600 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">FIRB Eligible</span>
            )}
            {l.sub_category && (
              <span className="bg-slate-700 text-slate-200 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                {humanizeTitle(l.sub_category)}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl md:text-3xl font-extrabold mb-2 text-slate-900">{l.title}</h1>
              {location && (
                <div className="flex items-center gap-1.5 text-slate-600 text-sm">
                  <Icon name="map-pin" size={14} />
                  {location}
                </div>
              )}
            </div>
            <div className="hidden sm:block shrink-0">
              <LotSaveButton slug={l.slug} title={l.title} vertical={l.vertical} />
            </div>
          </div>
        </div>
      </section>

      {/* Sticky-bar sentinel: the mobile action bar appears once this scrolls away. */}
      <div id={HERO_SENTINEL_ID} aria-hidden className="h-px" />

      <section className="py-6 md:py-8 bg-slate-50">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-8">
            <div className="lg:col-span-2 space-y-5">
              <ListingImageGallery images={l.images} alt={l.title} vertical={l.vertical} listingId={l.id} subCategory={l.sub_category} />

              <LotMedia km={km} />

              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                      {price?.label ?? kindMeta.priceLabel}
                    </p>
                    <p className="text-3xl font-extrabold text-slate-900">
                      {price?.value ?? "Price on application"}
                    </p>
                    {perUnit && (
                      <p className="text-sm font-semibold text-emerald-800 mt-0.5">
                        ≈ {perUnit.value}
                      </p>
                    )}
                  </div>
                  {highlight && (
                    <div className="text-right">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                        {highlight.label}
                      </p>
                      <p className="text-xl font-bold text-amber-700">{highlight.value}</p>
                    </div>
                  )}
                  <div className="sm:hidden w-full">
                    <LotSaveButton slug={l.slug} title={l.title} vertical={l.vertical} />
                  </div>
                </div>
              </div>

              {facts.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl p-6">
                  <h2 className="text-base font-bold text-slate-900 mb-4">{intel.detailsHeading}</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {facts.map((fact) => (
                      <div key={fact.key} className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs text-slate-500 mb-1">{fact.label}</p>
                        <p className="text-sm font-bold text-slate-900">{fact.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {l.description && (
                <div className="bg-white border border-slate-200 rounded-xl p-6">
                  <h2 className="text-base font-bold text-slate-900 mb-3">{intel.aboutHeading}</h2>
                  <div className="prose prose-slate prose-sm max-w-none">
                    {l.description.split("\n").map((para, i) => (<p key={i}>{para}</p>))}
                  </div>
                </div>
              )}

              <LotFieldGuide intel={intel} categorySlug={categorySlug} categoryLabel={categoryLabel} />
              <LotPaperTrail profile={profile} />
              <LotTransparency assessment={transparency} />
              <LotHoldingCosts profile={profile} intel={intel} />
              <LotLiquidityExit profile={profile} intel={intel} />
              <LotDueDiligence categorySlug={categorySlug} slug={l.slug} />
              <LotComparables profile={profileWithComps} />
              <LotRecentlySold rows={recentlySold} categoryLabel={categoryLabel} />

              {l.firb_eligible && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex gap-4">
                  <Icon name="globe" size={20} className="text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-blue-900 text-sm mb-1">FIRB Eligible</p>
                    <p className="text-sm text-blue-700">
                      {intel.firbNote ??
                        "Foreign investment may require FIRB approval for this asset class. Check the thresholds and notification rules before investing."}
                    </p>
                    <Link href="/foreign-investment" className="inline-flex items-center gap-1 text-blue-700 font-semibold text-xs mt-2 hover:text-blue-900">
                      Learn about FIRB <Icon name="arrow-right" size={11} />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-5">
              {/* externalCta kinds (listed securities) must not solicit
                  enquiries — the sanctioned posture is factual listing +
                  "buy via your own broker" referral. The card keeps the
                  #enquire id so the mobile sticky bar's anchor lands here. */}
              {l.status === "sold" ? (
                <div id="enquire" className="bg-white border border-emerald-200 rounded-xl p-6 lg:sticky lg:top-20 scroll-mt-24">
                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold px-2.5 py-1 rounded-full mb-3">
                    <Icon name="check-circle" size={12} />
                    SOLD
                  </span>
                  <h2 className="text-base font-bold text-slate-900 mb-1">This listing has sold</h2>
                  <p className="text-xs text-slate-500 mb-4">
                    {(l as { sold_price_cents?: number | null }).sold_price_cents
                      ? `Realised price: ${formatAudCompact((l as { sold_price_cents?: number | null }).sold_price_cents!)}. `
                      : ""}
                    It stays here as factual sales history — enquiries are closed.
                  </p>
                  <Link
                    href={listingsHref}
                    className="inline-flex w-full items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-4 py-2.5 rounded-xl transition-colors text-sm"
                  >
                    Browse live {categoryLabel} listings
                    <Icon name="arrow-right" size={14} />
                  </Link>
                  <p className="mt-3 text-xs text-slate-500">
                    Save a search on the listings page and we&apos;ll email you when
                    similar opportunities go live.
                  </p>
                </div>
              ) : kindMeta.externalCta ? (
                <div id="enquire" className="bg-white border border-slate-200 rounded-xl p-6 lg:sticky lg:top-20 scroll-mt-24">
                  <h2 className="text-base font-bold text-slate-900 mb-1">How to invest</h2>
                  <p className="text-xs text-slate-500 mb-4">
                    This is an ASX-listed security — you buy it on-market through
                    your own broker, not by enquiry. Listing shown for general
                    information only; not an offer or recommendation.
                  </p>
                  <Link
                    href="/share-trading"
                    className="inline-flex w-full items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-4 py-2.5 rounded-xl transition-colors text-sm"
                  >
                    Compare share-trading platforms
                    <Icon name="arrow-right" size={14} />
                  </Link>
                  {l.external_url && /^https?:\/\//.test(l.external_url) && (
                    <a
                      href={l.external_url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
                    >
                      Official company information
                      <Icon name="external-link" size={12} />
                    </a>
                  )}
                </div>
              ) : (
                <div id="enquire" className="bg-white border border-slate-200 rounded-xl p-6 lg:sticky lg:top-20 scroll-mt-24">
                  <h2 className="text-base font-bold text-slate-900 mb-1">{intel.enquiryHeading}</h2>
                  <p className="text-xs text-slate-500 mb-4">{intel.enquirySubcopy}</p>
                  <ListingEnquiryForm listingId={l.id} listingTitle={l.title} vertical={categorySlug} />
                </div>
              )}

              <ListingDecisionTools listing={l} />

              <LotListerCard km={km} noun={intel.noun} />

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex gap-6">
                <div className="text-center">
                  <p className="text-lg font-bold text-slate-900">{l.views ?? 0}</p>
                  <p className="text-xs text-slate-500">Views</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-slate-900">{l.enquiries ?? 0}</p>
                  <p className="text-xs text-slate-500">Enquiries</p>
                </div>
              </div>
            </div>
          </div>

          {relatedListings.length > 0 && (
            <div className="mt-12">
              <h2 className="text-xl font-extrabold text-slate-900 mb-6">Other {categoryLabel} Opportunities</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {relatedListings.map((rel) => (<ListingCard key={rel.id} listing={rel} vertical={categorySlug} />))}
              </div>
            </div>
          )}

          <p className="mt-10 text-xs text-slate-400 max-w-3xl">
            {GENERAL_ADVICE_WARNING} Listings are general information provided
            by sellers — not an offer, recommendation or endorsement by
            Invest.com.au. Verify every claim independently before
            transacting.
          </p>
        </div>
      </section>

      <section className="py-10 bg-white border-t border-slate-100">
        <div className="container-custom text-center">
          <Link
            href={listingsHref}
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-6 py-3 rounded-xl transition-colors"
          >
            Browse All {categoryLabel} Opportunities
            <Icon name="arrow-right" size={16} />
          </Link>
        </div>
      </section>

      <LotStickyActions
        sentinelId={HERO_SENTINEL_ID}
        priceLabel={price?.label ?? kindMeta.priceLabel}
        priceValue={price?.value ?? "POA"}
        enquiryCta={l.status === "sold" ? "" : kindMeta.externalCta ? "How to invest" : "Enquire"}
        slug={l.slug}
        title={l.title}
        vertical={l.vertical}
      />
    </div>
  );
}
