import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { getAllInvestCategories } from "@/lib/invest-categories";
import {
  fetchListingsByVertical,
  countListingsByVertical,
} from "@/lib/investment-listings-query";
import InvestListingsClient from "@/components/InvestListingsClient";
import DirectoryHero from "@/components/directory/DirectoryHero";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const count = await countListingsByVertical("royalties");
  const countLabel = count > 0 ? `${count} ` : "";
  return {
    title: `Royalty & IP Investment Opportunities Australia — ${countLabel}Listings (${CURRENT_YEAR})`,
    description:
      "Browse Australian royalty and IP investment opportunities. Mining, music catalogue, patent, film residuals and pharmaceutical royalties.",
    alternates: { canonical: `${SITE_URL}/invest/royalties/listings` },
    // No live listings yet — de-indexed until supply threshold is met.
    // Remove when countListingsByVertical("royalties") > 0 in prod.
    robots: { index: false, follow: false },
    openGraph: {
      title: `Royalty & IP Investment Opportunities Australia — ${countLabel}Active Listings`,
      url: `${SITE_URL}/invest/royalties/listings`,
      images: [{ url: `/api/og?title=${encodeURIComponent("Royalty Investment Opportunities")}&sub=${encodeURIComponent("Active Listings · Australia · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
    },
  };
}

export default async function RoyaltiesListingsPage() {
  const listings = await fetchListingsByVertical("royalties");
  const categoryTabs = getAllInvestCategories().map((c) => ({ slug: c.slug, label: c.label }));

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Royalties & IP", url: `${SITE_URL}/invest/royalties` },
    { name: "Opportunities" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {/* House-standard compact light header (E7) — replaces the client's
          tall page-title band so results land near the fold. */}
      <DirectoryHero
        tone="light"
        breadcrumbLabel="Royalties & IP / Listings"
        headlineLead="Royalty & IP"
        headlineAccent="opportunities"
        subtitle="Browse Australian royalty and intellectual property investment opportunities — mining royalties, music catalogues, patent royalties, film residuals and pharmaceutical royalties."
        stats={listings.length > 0 ? [{ v: String(listings.length), l: "Live listings" }] : undefined}
        containerClassName="container-custom"
      >
        <Link
          href="/invest"
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-[0.65rem] font-semibold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 md:text-xs"
        >
          ← Browse all investment sectors
        </Link>
      </DirectoryHero>
      <Suspense fallback={<div className="py-12 text-center text-slate-400">Loading listings...</div>}>
        <InvestListingsClient
          listings={listings}
          categories={categoryTabs}
          lockedCategory="royalties"
        />
      </Suspense>
    </>
  );
}
