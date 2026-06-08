import type { Metadata } from "next";
import Link from "next/link";

import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import {
  listApprovedListings,
  LISTING_KINDS,
  LISTING_KIND_LABELS,
  isListingKind,
  type Listing,
  type ListingKind,
} from "@/lib/listings";
import { faqJsonLd } from "@/lib/schema-markup";

export const revalidate = 300;

const LISTINGS_FAQS = [
  {
    q: "What types of investment listings are on this page?",
    a: "Invest.com.au hosts owner-listed investment opportunities across four categories: (1) Property — residential, commercial, and development sites offered by private vendors; (2) Businesses — established businesses and franchises seeking buyers or co-investors; (3) Syndicates — equity or debt syndicate opportunities put together by professional promoters; and (4) Other — agricultural assets, managed schemes, and alternative investments that don't fit the above. All listings are submitted by owners directly and reviewed by Invest.com.au's admin team before publication.",
  },
  {
    q: "Are listings on this page genuine investment opportunities?",
    a: "Listings are admin-reviewed for completeness and basic plausibility before they go live — we check that contact details are valid and the listing description is coherent. However, Invest.com.au does not verify or endorse the financial merits of any listing. Every listing carries a risk that the investment does not perform as described. Always engage a licensed financial adviser, accountant, and solicitor before committing funds. For syndicate and managed scheme listings, verify that the promoter holds the appropriate AFSL before investing.",
  },
  {
    q: "How do I post my own listing?",
    a: "Click 'Post a listing' at the top of this page. You'll need a free Invest.com.au account. Fill in the listing details — type, asking price or price-on-request, location, description, and contact method. Your listing is held for admin review and typically goes live within 1 business day. Listings are free to post during the current beta period. If your listing involves a managed investment scheme, syndicate, or requires an AFSL to promote, you are solely responsible for ensuring your listing complies with the Corporations Act 2001.",
  },
  {
    q: "How can I get matched to a professional for due diligence?",
    a: "Each listing has a 'Get Matched' button that connects you to relevant professionals — licensed financial advisers for investment strategy, accountants for tax implications, conveyancers or solicitors for property, and business brokers for business acquisitions. Matching is free. You describe your situation and we introduce you to verified professionals who can assess the opportunity. This is the most important step: do not commit funds to any listing without professional due diligence.",
  },
];

const listingsFaqLd = faqJsonLd(LISTINGS_FAQS);

export const metadata: Metadata = {
  title: `Australian Investment Listings (${CURRENT_YEAR}) — Invest.com.au`,
  description:
    "Browse owner-listed investment opportunities across property, businesses, syndicates and other Australian assets. Admin-reviewed listings. Get matched to the right pros for due diligence.",
  alternates: { canonical: `${SITE_URL}/listings` },
  robots: { index: true, follow: true },
};

function formatPrice(listing: Listing): string {
  if (listing.askingPriceCents === null) return "Price on request";
  const aud = listing.askingPriceCents / 100;
  const formatter = new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: listing.currency || "AUD",
    maximumFractionDigits: 0,
  });
  return formatter.format(aud);
}

export default async function ListingsBrowsePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const kindParam = typeof sp.kind === "string" ? sp.kind : undefined;
  const stateParam = typeof sp.state === "string" ? sp.state : undefined;
  const kind: ListingKind | undefined = isListingKind(kindParam) ? kindParam : undefined;

  const listings = await listApprovedListings({ kind, state: stateParam });

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Listings" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {listingsFaqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(listingsFaqLd) }}
        />
      )}

      <section className="bg-slate-900 text-white">
        <div className="max-w-5xl mx-auto px-4 py-12 sm:py-16">
          <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-2">
            Owner-listed · Admin reviewed
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-2">
            Investment listings
          </h1>
          <p className="text-slate-300 max-w-2xl">
            Opportunities posted directly by Australian owners. Filter by
            kind, then Get Matched to the right pros for due diligence.
          </p>
          <div className="mt-6">
            <Link
              href="/listings/new"
              className="inline-flex items-center bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold px-4 py-2 rounded-lg text-sm"
            >
              Have something to list? Post a listing →
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-8 sm:py-12">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex flex-wrap gap-2 mb-6">
            <Link
              href="/listings"
              className={
                !kind
                  ? "px-3 py-1 rounded-full bg-slate-900 text-white text-xs font-semibold"
                  : "px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-700 text-xs font-semibold"
              }
            >
              All kinds
            </Link>
            {LISTING_KINDS.map((k) => (
              <Link
                key={k}
                href={`/listings?kind=${k}`}
                className={
                  kind === k
                    ? "px-3 py-1 rounded-full bg-slate-900 text-white text-xs font-semibold"
                    : "px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-700 text-xs font-semibold"
                }
              >
                {LISTING_KIND_LABELS[k]}
              </Link>
            ))}
          </div>

          {listings.length === 0 ? (
            <p className="text-sm text-slate-600 bg-white border border-slate-200 rounded-lg p-6">
              No approved listings yet for this filter. Check back soon — or{" "}
              <Link
                href="/listings/new"
                className="text-amber-600 hover:underline font-semibold"
              >
                post your own listing
              </Link>
              .
            </p>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {listings.map((l) => (
                <li
                  key={l.id}
                  className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 mb-1">
                    {LISTING_KIND_LABELS[l.kind]}
                  </p>
                  <h2 className="text-base font-extrabold text-slate-900 mb-1">
                    <Link
                      href={`/listings/${l.slug}`}
                      className="hover:text-amber-700"
                    >
                      {l.title}
                    </Link>
                  </h2>
                  <p className="text-xs text-slate-500 mb-2">
                    {l.locationState || "Australia-wide"}
                    {" · "}
                    {formatPrice(l)}
                  </p>
                  {l.description && (
                    <p className="text-sm text-slate-700 line-clamp-2">
                      {l.description}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <div className="border-t border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-8 md:py-10">
          <h2 className="text-lg font-extrabold text-slate-900 mb-5">Frequently asked questions</h2>
          <div className="space-y-3">
            {LISTINGS_FAQS.map((faq) => (
              <details key={faq.q} className="group rounded-xl border border-slate-200 bg-slate-50">
                <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-semibold text-slate-900 list-none">
                  {faq.q}
                  <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform" aria-hidden="true">▾</span>
                </summary>
                <p className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
