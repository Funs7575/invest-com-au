import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { breadcrumbJsonLd, SITE_URL, absoluteUrl } from "@/lib/seo";
import {
  getListingBySlug,
  incrementListingViewCount,
  LISTING_KIND_LABELS,
  type Listing,
} from "@/lib/listings";

export const revalidate = 300;

type Params = { params: Promise<{ slug: string }> };

function formatPrice(listing: Listing): string {
  if (listing.askingPriceCents === null) return "Price on request";
  const aud = listing.askingPriceCents / 100;
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: listing.currency || "AUD",
    maximumFractionDigits: 0,
  }).format(aud);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getListingBySlug(slug);
  if (!listing || listing.status !== "approved") {
    return { title: "Listing not found — Invest.com.au", robots: "noindex, nofollow" };
  }
  const title = `${listing.title} — ${LISTING_KIND_LABELS[listing.kind]} — Invest.com.au`;
  const description =
    listing.description?.slice(0, 200) ||
    `Australian ${LISTING_KIND_LABELS[listing.kind].toLowerCase()} opportunity.`;
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/listings/${listing.slug}` },
    robots: { index: true, follow: true },
  };
}

export default async function ListingDetailPage({ params }: Params) {
  const { slug } = await params;
  const listing = await getListingBySlug(slug);
  if (!listing || listing.status !== "approved") {
    notFound();
  }

  // Best-effort engagement counter — never blocks render.
  void incrementListingViewCount(listing.id);

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Listings", url: `${SITE_URL}/listings` },
    { name: listing.title },
  ]);

  const moreInfoHref = `/briefs/new?template=opportunity_assessment&listing_id=${encodeURIComponent(
    listing.id,
  )}`;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      <section className="bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto px-4 py-12 sm:py-16">
          <nav className="text-xs text-slate-400 mb-2">
            <Link href="/listings" className="hover:text-white">
              ← All listings
            </Link>
          </nav>
          <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-2">
            {LISTING_KIND_LABELS[listing.kind]}
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-2">
            {listing.title}
          </h1>
          <p className="text-slate-300 text-sm mb-4">
            {listing.locationState || "Australia-wide"} · {formatPrice(listing)}
          </p>
          <a
            href={moreInfoHref}
            className="inline-flex items-center bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold px-5 py-2.5 rounded-lg text-sm"
          >
            Send me more info →
          </a>
          <p className="text-xs text-slate-500 mt-2">
            Opens a Match Request — verified Australian pros will help with
            due diligence, legal, and finance.
          </p>
        </div>
      </section>

      <section className="bg-white py-10 sm:py-14">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-xl font-extrabold text-slate-900 mb-3">
            About this opportunity
          </h2>
          {listing.description ? (
            <p className="whitespace-pre-wrap text-slate-800 leading-relaxed">
              {listing.description}
            </p>
          ) : (
            <p className="text-slate-500 text-sm">
              The owner did not include extra notes — request more info to ask
              questions directly.
            </p>
          )}
        </div>
      </section>

      <section className="bg-slate-50 py-10 sm:py-14">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm text-center">
            <h2 className="text-lg font-extrabold text-slate-900 mb-2">
              Interested?
            </h2>
            <p className="text-sm text-slate-600 mb-4">
              We&rsquo;ll match you with verified Australian pros for due
              diligence, finance and legal review.
            </p>
            <a
              href={moreInfoHref}
              className="inline-flex items-center bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold px-5 py-2.5 rounded-lg text-sm"
            >
              Send me more info →
            </a>
            <p className="text-xs text-slate-500 mt-3">
              <Link href={absoluteUrl("/listings")} className="hover:underline">
                Browse more listings
              </Link>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
