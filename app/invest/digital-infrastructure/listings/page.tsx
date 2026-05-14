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
  const count = await countListingsByVertical("digital-infrastructure");
  const countLabel = count > 0 ? `${count} ` : "";
  return {
    title: `Digital Infrastructure Investment Opportunities Australia — ${countLabel}Listings (${CURRENT_YEAR})`,
    description:
      "Browse Australian digital infrastructure investment opportunities. Data centres, fibre networks, subsea cables, AI compute facilities and tower assets available for investment.",
    alternates: { canonical: `${SITE_URL}/invest/digital-infrastructure/listings` },
    openGraph: {
      title: `Digital Infrastructure Investment Opportunities Australia — ${countLabel}Active Listings`,
      url: `${SITE_URL}/invest/digital-infrastructure/listings`,
    },
  };
}

export default async function DigitalInfrastructureListingsPage() {
  const listings = await fetchListingsByVertical("digital-infrastructure");
  const categoryTabs = getAllInvestCategories().map((c) => ({ slug: c.slug, label: c.label }));

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Digital Infrastructure", url: `${SITE_URL}/invest/digital-infrastructure` },
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
          lockedCategory="digital-infrastructure"
          pageTitle="Digital Infrastructure Investment Listings"
          pageSubtitle="Browse Australian digital infrastructure investment opportunities — data centres, fibre networks, subsea cables, AI compute and tower assets."
        />
      </Suspense>
    </>
  );
}
