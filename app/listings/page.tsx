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

export const revalidate = 300;

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
    </>
  );
}
