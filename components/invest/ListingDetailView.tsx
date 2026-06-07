import Link from "next/link";
import { breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import Icon from "@/components/Icon";
import ListingImageGallery from "@/components/ListingImageGallery";
import ListingCard, { type InvestmentListing } from "@/components/ListingCard";
import ListingEnquiryForm from "@/components/ListingEnquiryForm";
import ListingDecisionTools from "@/components/invest/ListingDecisionTools";
import ListingSchemaScripts from "@/components/ListingSchemaScripts";

/**
 * Shared single-listing detail view.
 *
 * Generalised from the per-category bespoke detail pages
 * (`app/invest/<cat>/listings/[slug]/page.tsx`) so that the generic
 * `app/invest/[slug]/listings/[subcategory]` route can render a listing
 * detail for ANY category — including the ones with no bespoke page
 * (funds, private-equity, royalties, venture-capital, …) that previously
 * 500'd in production. Presentational only; the route fetches the listing
 * + related and passes them in.
 */

function formatCents(cents: number): string {
  if (cents >= 1_000_000_00) return `$${(cents / 1_000_000_00).toFixed(1)}M`;
  if (cents >= 1_000_00) return `$${(cents / 1_000_00).toFixed(0)}K`;
  return `$${(cents / 100).toLocaleString("en-AU")}`;
}

export interface ListingDetailViewProps {
  listing: InvestmentListing;
  relatedListings: InvestmentListing[];
  /** URL category slug (e.g. "funds") for breadcrumbs / links. */
  categorySlug: string;
  /** Display label (e.g. "Managed Funds") for copy. */
  categoryLabel: string;
}

export default function ListingDetailView({
  listing: l,
  relatedListings,
  categorySlug,
  categoryLabel,
}: ListingDetailViewProps) {
  const km = (l.key_metrics ?? {}) as Record<string, unknown>;
  const location = [l.location_city, l.location_state].filter(Boolean).join(", ");
  const listingsHref = `/invest/${categorySlug}/listings`;

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: categoryLabel, url: `${SITE_URL}/invest/${categorySlug}` },
    { name: "Opportunities", url: `${SITE_URL}${listingsHref}` },
    { name: l.title },
  ]);

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <ListingSchemaScripts listing={l} vertical={categorySlug} />

      <section className="bg-white border-b border-slate-100 py-12">
        <div className="container-custom">
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-4" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-slate-900 transition-colors">Home</Link>
            <Icon name="chevron-right" size={12} className="text-slate-300" />
            <Link href={listingsHref} className="hover:text-slate-900 transition-colors">{categoryLabel} Opportunities</Link>
            <Icon name="chevron-right" size={12} className="text-slate-300" />
            <span className="text-slate-900 font-medium truncate max-w-40">{l.title}</span>
          </nav>

          <div className="flex flex-wrap gap-2 mb-3">
            {l.listing_type === "featured" && (
              <span className="bg-amber-500 text-slate-900 text-xs font-bold px-2.5 py-0.5 rounded-full">Featured</span>
            )}
            {l.firb_eligible && (
              <span className="bg-blue-600 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">FIRB Eligible</span>
            )}
            {!!km.commodity && (
              <span className="bg-amber-700 text-amber-100 text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize">{String(km.commodity)}</span>
            )}
            {!!km.stage && (
              <span className="bg-slate-700 text-slate-200 text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize">{String(km.stage)}</span>
            )}
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold mb-2 text-slate-900">{l.title}</h1>
          {location && (
            <div className="flex items-center gap-1.5 text-slate-600 text-sm">
              <Icon name="map-pin" size={14} />
              {location}
            </div>
          )}
        </div>
      </section>

      <section className="py-10 bg-slate-50">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <ListingImageGallery images={l.images} alt={l.title} vertical={l.vertical} listingId={l.id} subCategory={l.sub_category} />

              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Investment Required</p>
                    <p className="text-3xl font-extrabold text-slate-900">
                      {l.price_display ?? (l.asking_price_cents ? formatCents(l.asking_price_cents) : "Price on application")}
                    </p>
                  </div>
                </div>
              </div>

              {Object.keys(km).length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl p-6">
                  <h2 className="text-base font-bold text-slate-900 mb-4">Opportunity Details</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {Object.entries(km).map(([key, value]) => (
                      <div key={key} className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs text-slate-500 capitalize mb-1">{key.replace(/_/g, " ")}</p>
                        <p className="text-sm font-bold text-slate-900 capitalize">{String(value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {l.description && (
                <div className="bg-white border border-slate-200 rounded-xl p-6">
                  <h2 className="text-base font-bold text-slate-900 mb-3">About This Opportunity</h2>
                  <div className="prose prose-slate prose-sm max-w-none">
                    {l.description.split("\n").map((para, i) => (<p key={i}>{para}</p>))}
                  </div>
                </div>
              )}

              {l.firb_eligible && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex gap-4">
                  <Icon name="globe" size={20} className="text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-blue-900 text-sm mb-1">FIRB Eligible</p>
                    <p className="text-sm text-blue-700">Foreign investment may require FIRB approval for this asset class. Check the thresholds and notification rules before investing.</p>
                    <Link href="/foreign-investment" className="inline-flex items-center gap-1 text-blue-700 font-semibold text-xs mt-2 hover:text-blue-900">
                      Learn about FIRB <Icon name="arrow-right" size={11} />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-5">
              <div className="bg-white border border-slate-200 rounded-xl p-6 sticky top-20">
                <h2 className="text-base font-bold text-slate-900 mb-1">Enquire About This Opportunity</h2>
                <p className="text-xs text-slate-500 mb-4">Send a confidential enquiry to the listing team.</p>
                <ListingEnquiryForm listingId={l.id} listingTitle={l.title} vertical={categorySlug} />
              </div>

              <ListingDecisionTools listing={l} />

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
    </div>
  );
}
