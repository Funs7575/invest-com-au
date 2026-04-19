import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import Icon from "@/components/Icon";
import ListingImageGallery from "@/components/ListingImageGallery";
import ListingCard, { type InvestmentListing } from "@/components/ListingCard";
import ListingEnquiryForm from "@/components/ListingEnquiryForm";
import ListingsEmptyState from "@/components/ListingsEmptyState";
import SubCategoryListingsView from "@/components/SubCategoryListingsView";
import {
  fetchListingBySlug,
  fetchListingsBySubCategory,
  fetchRelatedListings,
  ALTERNATIVES_SUB_CATEGORIES,
} from "@/lib/investment-listings-query";
import { getSubcategoryBySlug } from "@/lib/invest-categories";
import ListingSchemaScripts from "@/components/ListingSchemaScripts";

export const revalidate = 300;

const CATEGORY_SLUG = "alternatives";
const CATEGORY_LABEL = "Alternative Investments";
// Alternatives listings live under vertical='fund' with sub_category
// in ALTERNATIVES_SUB_CATEGORIES. When the trailing [slug] is a listing
// slug (not a sub-category), we still look it up in the fund vertical.
const VERTICAL = "fund" as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  // Sub-category metadata takes precedence — if the slug names a
  // known sub-category (e.g. "coins"), use the sub-category's own
  // title/meta rather than trying a DB lookup that would miss.
  const subCat = getSubcategoryBySlug(CATEGORY_SLUG, slug);
  if (subCat) {
    return {
      title: subCat.title,
      description: subCat.metaDescription,
      alternates: { canonical: `${SITE_URL}/invest/${CATEGORY_SLUG}/listings/${slug}` },
      openGraph: {
        title: subCat.title,
        description: subCat.metaDescription,
        url: `${SITE_URL}/invest/${CATEGORY_SLUG}/listings/${slug}`,
      },
      twitter: { card: "summary_large_image" as const },
    };
  }

  // Otherwise look up the listing. We restrict the query to
  // alternatives-eligible sub_categories so a fund that isn't
  // really an alternative can't steal the URL.
  const listing = await fetchListingBySlug(VERTICAL, slug);
  if (
    !listing ||
    !listing.sub_category ||
    !(ALTERNATIVES_SUB_CATEGORIES as readonly string[]).includes(listing.sub_category)
  ) {
    return { title: `Alternative Investments (${CURRENT_YEAR})` };
  }

  const title = `${listing.title} — Alternative Investment ${listing.location_state ? `in ${listing.location_state}` : "in Australia"} (${CURRENT_YEAR})`;
  return {
    title,
    description: listing.description?.slice(0, 160) ?? `Alternative investment opportunity. ${listing.price_display ?? ""}`,
    alternates: { canonical: `${SITE_URL}/invest/${CATEGORY_SLUG}/listings/${slug}` },
    openGraph: {
      title,
      description: listing.description?.slice(0, 160),
      url: `${SITE_URL}/invest/${CATEGORY_SLUG}/listings/${slug}`,
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

export default async function AlternativesListingDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // ── Resolution order ────────────────────────────────────────
  // 1. Sub-category filter: if the slug names a known sub-category
  //    of this vertical, show the filtered listings grid.
  // 2. Single listing detail: if a listing exists with that slug,
  //    show the detail page.
  // 3. Empty state (200, NOT notFound): friendly "nothing here yet"
  //    page with links back to the category and the submit form.
  // This ordering means SubCategoryNav links always resolve (even
  // with zero matching listings) while pre-existing listing URLs
  // keep working.

  const subCat = getSubcategoryBySlug(CATEGORY_SLUG, slug);
  if (subCat) {
    const listings = await fetchListingsBySubCategory(VERTICAL, subCat.dbValue);
    return (
      <SubCategoryListingsView
        listings={listings}
        subCategory={subCat}
        categorySlug={CATEGORY_SLUG}
        categoryLabel={CATEGORY_LABEL}
      />
    );
  }

  const listing = await fetchListingBySlug(VERTICAL, slug);

  // Reject listings that aren't really alternatives (the fund
  // vertical also covers private credit, infrastructure, etc.)
  if (
    !listing ||
    !listing.sub_category ||
    !(ALTERNATIVES_SUB_CATEGORIES as readonly string[]).includes(listing.sub_category)
  ) {
    return (
      <ListingsEmptyState
        categoryLabel={CATEGORY_LABEL}
        categorySlug={CATEGORY_SLUG}
      />
    );
  }

  const l = listing as InvestmentListing;
  const relatedListings = await fetchRelatedListings(VERTICAL, slug, l.sub_category, 3);

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Alternative Investments", url: `${SITE_URL}/invest/${CATEGORY_SLUG}` },
    { name: "Listings", url: `${SITE_URL}/invest/${CATEGORY_SLUG}/listings` },
    { name: l.title },
  ]);

  const km = (l.key_metrics ?? {}) as Record<string, unknown>;
  const location = [l.location_city, l.location_state].filter(Boolean).join(", ");

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <ListingSchemaScripts listing={l} vertical={CATEGORY_SLUG} />

      {/* Hero */}
      <section className="bg-white border-b border-slate-100 py-12">
        <div className="container-custom">
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-4" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-slate-900 transition-colors">Home</Link>
            <Icon name="chevron-right" size={12} className="text-slate-300" aria-hidden="true" />
            <Link href="/invest" className="hover:text-slate-900 transition-colors">Invest</Link>
            <Icon name="chevron-right" size={12} className="text-slate-300" aria-hidden="true" />
            <Link href={`/invest/${CATEGORY_SLUG}/listings`} className="hover:text-slate-900 transition-colors">{CATEGORY_LABEL}</Link>
            <Icon name="chevron-right" size={12} className="text-slate-300" aria-hidden="true" />
            <span className="text-slate-900 font-medium truncate max-w-[160px]">{l.title}</span>
          </nav>

          <div className="flex flex-wrap gap-2 mb-3">
            {l.listing_type === "featured" && (
              <span className="bg-amber-500 text-slate-900 text-xs font-bold px-2.5 py-0.5 rounded-full">Featured</span>
            )}
            {l.listing_type === "premium" && (
              <span className="bg-yellow-400 text-slate-900 text-xs font-bold px-2.5 py-0.5 rounded-full">Premium</span>
            )}
            {l.firb_eligible && (
              <span className="bg-blue-600 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">FIRB Eligible</span>
            )}
            {l.sub_category && (
              <span className="bg-slate-700 text-slate-200 text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize">
                {l.sub_category.replace(/_/g, " ")}
              </span>
            )}
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold mb-2 text-slate-900">{l.title}</h1>
          {location && (
            <div className="flex items-center gap-1.5 text-slate-600 text-sm">
              <Icon name="map-pin" size={14} aria-hidden="true" />
              {location}
            </div>
          )}
        </div>
      </section>

      {/* Main content */}
      <section className="py-10 bg-slate-50">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: details */}
            <div className="lg:col-span-2 space-y-6">
              <ListingImageGallery images={l.images} alt={l.title} />
              {/* Price card */}
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Estimated Value</p>
                    <p className="text-3xl font-extrabold text-slate-900">
                      {l.price_display ?? (l.asking_price_cents ? formatCents(l.asking_price_cents) : "Price on application")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Key metrics */}
              {Object.keys(km).length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl p-6">
                  <h2 className="text-base font-bold text-slate-900 mb-4">Key Metrics</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {Object.entries(km).map(([key, value]) => (
                      <div key={key} className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs text-slate-500 capitalize mb-1">{key.replace(/_/g, " ")}</p>
                        <p className="text-sm font-bold text-slate-900">
                          {typeof value === "number" && key.includes("cents")
                            ? formatCents(value)
                            : String(value)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              {l.description && (
                <div className="bg-white border border-slate-200 rounded-xl p-6">
                  <h2 className="text-base font-bold text-slate-900 mb-3">About This Investment</h2>
                  <div className="prose prose-slate prose-sm max-w-none">
                    {l.description.split("\n").map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* FIRB info */}
              {l.firb_eligible && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex gap-4">
                  <Icon name="globe" size={20} className="text-blue-600 shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="font-bold text-blue-900 text-sm mb-1">FIRB Eligible</p>
                    <p className="text-sm text-blue-700">
                      This alternative investment is eligible for foreign investment under the Foreign Investment Review Board framework. FIRB approval may be required for foreign buyers. Our advisors can guide you through the process.
                    </p>
                    <Link href="/foreign-investment" className="inline-flex items-center gap-1 text-blue-700 font-semibold text-xs mt-2 hover:text-blue-900">
                      Learn about FIRB <Icon name="arrow-right" size={11} aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Enquiry form */}
            <div className="space-y-5">
              <div className="bg-white border border-slate-200 rounded-xl p-6 sticky top-20">
                <h2 className="text-base font-bold text-slate-900 mb-1">Enquire About This Listing</h2>
                <p className="text-xs text-slate-500 mb-4">
                  Send a confidential enquiry directly to the listing representative.
                </p>
                <ListingEnquiryForm
                  listingId={l.id}
                  listingTitle={l.title}
                  vertical="alternatives"
                />
              </div>

              {/* Stats */}
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

          {/* Related listings */}
          {relatedListings.length > 0 && (
            <div className="mt-12">
              <h2 className="text-xl font-extrabold text-slate-900 mb-6">Similar Alternative Investments</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {relatedListings.map((rel) => (
                  <ListingCard key={rel.id} listing={rel} vertical="alternatives" />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* List CTA */}
      <section className="py-10 bg-white border-t border-slate-100">
        <div className="container-custom text-center">
          <p className="text-slate-500 text-sm mb-4">Looking for more opportunities?</p>
          <Link
            href={`/invest/${CATEGORY_SLUG}/listings`}
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-6 py-3 rounded-xl transition-colors"
          >
            Browse All Alternative Investments
            <Icon name="arrow-right" size={16} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}
