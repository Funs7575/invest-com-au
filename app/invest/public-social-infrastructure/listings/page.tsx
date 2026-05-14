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
  const count = await countListingsByVertical("public-social-infrastructure");
  const countLabel = count > 0 ? `${count} ` : "";
  return {
    title: `Public & Social Infrastructure Investment Australia — ${countLabel}Listings (${CURRENT_YEAR})`,
    description:
      "Browse Australian public and social infrastructure investment opportunities. Toll roads, water utilities, hospitals, schools, social housing and PPP assets available for co-investment.",
    alternates: { canonical: `${SITE_URL}/invest/public-social-infrastructure/listings` },
    openGraph: {
      title: `Public & Social Infrastructure Investment Australia — ${countLabel}Active Listings`,
      url: `${SITE_URL}/invest/public-social-infrastructure/listings`,
    },
  };
}

export default async function PublicSocialInfrastructureListingsPage() {
  const listings = await fetchListingsByVertical("public-social-infrastructure");
  const categoryTabs = getAllInvestCategories().map((c) => ({ slug: c.slug, label: c.label }));

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Public & Social Infrastructure", url: `${SITE_URL}/invest/public-social-infrastructure` },
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
          lockedCategory="public-social-infrastructure"
          pageTitle="Public & Social Infrastructure Investment Listings"
          pageSubtitle="Browse Australian public and social infrastructure investment opportunities — toll roads, water utilities, hospitals, schools, social housing and PPP availability-payment assets."
        />
      </Suspense>
    </>
  );
}
