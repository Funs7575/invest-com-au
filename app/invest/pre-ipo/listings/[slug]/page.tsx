import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import Icon from "@/components/Icon";
import ListingImageGallery from "@/components/ListingImageGallery";
import ListingCard, { type InvestmentListing } from "@/components/ListingCard";
import ListingEnquiryForm from "@/components/ListingEnquiryForm";
import ListingsEmptyState from "@/components/ListingsEmptyState";
import {
  fetchListingBySlug,
  fetchRelatedListings,
} from "@/lib/investment-listings-query";
import ListingSchemaScripts from "@/components/ListingSchemaScripts";

export const revalidate = 300;

const CATEGORY_SLUG = "pre-ipo";
const CATEGORY_LABEL = "Pre-IPO";
const VERTICAL = "pre_ipo" as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const listing = await fetchListingBySlug(VERTICAL, slug);
  if (!listing) return { title: `Pre-IPO Investments (${CURRENT_YEAR})` };
  const km = (listing.key_metrics ?? {}) as Record<string, unknown>;
  const stage = km.stage as string | undefined;
  const raising = km.raising_cents as number | undefined;
  const raisingStr = raising ? ` — Raising $${Math.round(raising / 100).toLocaleString("en-AU")}` : "";
  const title = `${listing.title}${raisingStr}${stage ? ` (${stage})` : ""} — Australian Pre-IPO (${CURRENT_YEAR})`;
  return {
    title,
    description: listing.description?.slice(0, 160) ?? `Australian pre-IPO opportunity — wholesale investors only.`,
    alternates: { canonical: `${SITE_URL}/invest/pre-ipo/listings/${slug}` },
    openGraph: {
      title,
      description: listing.description?.slice(0, 160),
      url: `${SITE_URL}/invest/pre-ipo/listings/${slug}`,
      images: [{
        url: `/api/og?title=${encodeURIComponent(listing.title)}&type=invest`,
        width: 1200,
        height: 630,
        alt: listing.title,
      }],
    },
    twitter: { card: "summary_large_image" as const },
  };
}

function formatCents(cents: number): string {
  if (cents >= 1_000_000_00) return `$${(cents / 1_000_000_00).toFixed(1)}M`;
  if (cents >= 1_000_00) return `$${(cents / 1_000_00).toFixed(0)}K`;
  return `$${(cents / 100).toLocaleString("en-AU")}`;
}

export default async function PreIpoOpportunityDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const listing = await fetchListingBySlug(VERTICAL, slug);
  if (!listing) {
    return (
      <ListingsEmptyState
        categoryLabel={CATEGORY_LABEL}
        categorySlug={CATEGORY_SLUG}
      />
    );
  }
  const l = listing as InvestmentListing;

  const relatedListings = await fetchRelatedListings(VERTICAL, slug, null, 3);
  const km = (l.key_metrics ?? {}) as Record<string, unknown>;
  const location = [l.location_city, l.location_state].filter(Boolean).join(", ");
  const ipoWindow = km.ipo_window as string | undefined;
  const discount = km.ipo_discount_percent as number | undefined;

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Pre-IPO", url: `${SITE_URL}/invest/pre-ipo` },
    { name: "Opportunities", url: `${SITE_URL}/invest/pre-ipo/listings` },
    { name: l.title },
  ]);

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <ListingSchemaScripts listing={l} vertical={CATEGORY_SLUG} />

      <section className="bg-red-50 border-b-2 border-red-200 py-4">
        <div className="container-custom">
          <div className="flex items-start gap-3 max-w-4xl">
            <Icon name="shield" size={18} className="text-red-800 shrink-0 mt-0.5" />
            <p className="text-xs md:text-sm text-red-900 leading-relaxed">
              <strong>Wholesale investors only (s708):</strong> this listing is a private
              placement available only to sophisticated and wholesale investors. Retail
              investors cannot subscribe. General information only — not financial advice.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white border-b border-slate-100 py-12">
        <div className="container-custom">
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-4" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-slate-900 transition-colors">Home</Link>
            <Icon name="chevron-right" size={12} className="text-slate-300" />
            <Link href="/invest/pre-ipo/listings" className="hover:text-slate-900 transition-colors">Pre-IPO Opportunities</Link>
            <Icon name="chevron-right" size={12} className="text-slate-300" />
            <span className="text-slate-900 font-medium truncate max-w-40">{l.title}</span>
          </nav>

          <div className="flex flex-wrap gap-2 mb-3">
            <span className="bg-red-600 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">Wholesale Only</span>
            {l.listing_type === "featured" && (
              <span className="bg-amber-500 text-slate-900 text-xs font-bold px-2.5 py-0.5 rounded-full">Featured</span>
            )}
            {!!km.stage && (
              <span className="bg-slate-700 text-slate-200 text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize">
                {String(km.stage)}
              </span>
            )}
            {l.industry && (
              <span className="bg-red-800 text-red-100 text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize">
                {l.industry.replace(/_/g, " ")}
              </span>
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
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                      {km.raising_cents ? "Round size" : "Investment Required"}
                    </p>
                    <p className="text-3xl font-extrabold text-slate-900">
                      {km.raising_cents
                        ? formatCents(km.raising_cents as number)
                        : (l.price_display ?? (l.asking_price_cents ? formatCents(l.asking_price_cents) : "Price on application"))}
                    </p>
                  </div>
                  {!!km.pre_money_valuation_cents && (
                    <div className="text-right">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Pre-Money Valuation</p>
                      <p className="text-xl font-bold text-slate-700">{formatCents(km.pre_money_valuation_cents as number)}</p>
                    </div>
                  )}
                </div>
                {(discount || ipoWindow) && (
                  <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-2 gap-4">
                    {discount && (
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-0.5">IPO Discount</p>
                        <p className="text-lg font-extrabold text-red-700">{discount}%</p>
                      </div>
                    )}
                    {ipoWindow && (
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-0.5">Anticipated IPO Window</p>
                        <p className="text-lg font-bold text-slate-900">{ipoWindow}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {Object.keys(km).length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl p-6">
                  <h2 className="text-base font-bold text-slate-900 mb-4">Deal Details</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {Object.entries(km).map(([key, value]) => (
                      <div key={key} className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs text-slate-500 capitalize mb-1">{key.replace(/_/g, " ")}</p>
                        <p className="text-sm font-bold text-slate-900">
                          {typeof value === "boolean" ? (value ? "Yes" : "No") :
                           typeof value === "number" && key.includes("cents") ? formatCents(value) :
                           String(value)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {l.description && (
                <div className="bg-white border border-slate-200 rounded-xl p-6">
                  <h2 className="text-base font-bold text-slate-900 mb-3">About This Opportunity</h2>
                  <div className="prose prose-slate prose-sm max-w-none">
                    {l.description.split("\n").map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                <p className="text-xs text-red-800 leading-relaxed">
                  <strong>Pre-IPO risk warning:</strong> Pre-IPO investments are illiquid
                  and high-risk. Capital is locked until IPO completion (often longer than
                  signalled), the IPO can be cancelled, and lockups typically restrict
                  selling for 6–24 months post-listing. You may lose some or all of your
                  investment. Subscribers must qualify under s708(8) (sophisticated) or
                  s708(11) (wholesale) of the Corporations Act 2001 (Cth). This is general
                  information only — obtain independent legal, tax and financial advice
                  before subscribing.
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="bg-white border border-slate-200 rounded-xl p-6 sticky top-20">
                <h2 className="text-base font-bold text-slate-900 mb-1">Express Interest</h2>
                <p className="text-xs text-slate-500 mb-4">
                  Send a confidential enquiry. The issuer will request s708 evidence
                  (accountant&apos;s certificate or sophisticated-investor declaration)
                  before sharing the offer document.
                </p>
                <ListingEnquiryForm listingId={l.id} listingTitle={l.title} vertical="pre_ipo" />
              </div>
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
              <h2 className="text-xl font-extrabold text-slate-900 mb-6">Other Pre-IPO Opportunities</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {relatedListings.map((rel) => (
                  <ListingCard key={rel.id} listing={rel} vertical="pre_ipo" />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="py-10 bg-white border-t border-slate-100">
        <div className="container-custom text-center">
          <Link
            href="/invest/pre-ipo/listings"
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-6 py-3 rounded-xl transition-colors"
          >
            Browse All Pre-IPO Opportunities
            <Icon name="arrow-right" size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
