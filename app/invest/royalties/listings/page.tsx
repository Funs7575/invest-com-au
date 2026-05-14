import type { Metadata } from "next";
import { Suspense } from "react";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { getAllInvestCategories } from "@/lib/invest-categories";
import {
  fetchListingsByVertical,
  countListingsByVertical,
} from "@/lib/investment-listings-query";
import InvestListingsClient from "@/components/InvestListingsClient";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const count = await countListingsByVertical("royalties");
  const countLabel = count > 0 ? `${count} ` : "";
  return {
    title: `Royalty & IP Investment Opportunities Australia — ${countLabel}Listings (${CURRENT_YEAR})`,
    description:
      "Browse Australian royalty and intellectual property investment opportunities. Mining royalties, music catalogue royalties, patent royalties, film residuals and pharmaceutical royalties available for investment.",
    alternates: { canonical: `${SITE_URL}/invest/royalties/listings` },
    openGraph: {
      title: `Royalty & IP Investment Opportunities Australia — ${countLabel}Active Listings`,
      url: `${SITE_URL}/invest/royalties/listings`,
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
      <Suspense fallback={<div className="py-12 text-center text-slate-400">Loading listings...</div>}>
        <InvestListingsClient
          listings={listings}
          categories={categoryTabs}
          lockedCategory="royalties"
          pageTitle="Royalty & IP Investment Listings"
          pageSubtitle="Browse Australian royalty and intellectual property investment opportunities — mining royalties, music catalogues, patent royalties, film residuals and pharmaceutical royalties."
        />
      </Suspense>
    </>
  );
}
