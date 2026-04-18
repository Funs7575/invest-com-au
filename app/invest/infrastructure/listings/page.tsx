import type { Metadata } from "next";
import { Suspense } from "react";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { getAllInvestCategories, getInvestCategoryBySlug } from "@/lib/invest-categories";
import {
  fetchListingsByVertical,
  countListingsByVertical,
  INFRASTRUCTURE_SUB_CATEGORIES,
} from "@/lib/investment-listings-query";
import InvestListingsClient from "@/components/InvestListingsClient";
import SubCategoryNav from "@/components/SubCategoryNav";

export const revalidate = 300;

// Infrastructure listings live under vertical='fund' + sub_category='infrastructure'.
// Old code queried vertical='infrastructure' which isn't a valid vertical and
// always returned zero rows.

export async function generateMetadata(): Promise<Metadata> {
  const count = await countListingsByVertical("fund", {
    subCategories: INFRASTRUCTURE_SUB_CATEGORIES,
  });
  const countLabel = count > 0 ? `${count} ` : "";
  return {
    title: `Infrastructure Investments Australia — Browse ${countLabel}Listings (${CURRENT_YEAR})`,
    description:
      "Explore infrastructure investment opportunities in Australia. Toll roads, energy, airports, ports, utilities and social infrastructure.",
    alternates: { canonical: `${SITE_URL}/invest/infrastructure/listings` },
    openGraph: {
      title: `Infrastructure Investments Australia — ${countLabel}Active Listings`,
      description:
        "Explore infrastructure investment opportunities in Australia. Toll roads, energy, airports, ports and more.",
      url: `${SITE_URL}/invest/infrastructure/listings`,
    },
  };
}

export default async function InfrastructureListingsPage() {
  const listings = await fetchListingsByVertical("fund", {
    subCategories: INFRASTRUCTURE_SUB_CATEGORIES,
  });
  const categoryTabs = getAllInvestCategories().map((c) => ({ slug: c.slug, label: c.label }));
  const category = getInvestCategoryBySlug("infrastructure");

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Infrastructure", url: `${SITE_URL}/invest/infrastructure` },
    { name: "Listings" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {category && (
        <div className="container-custom pt-6">
          <SubCategoryNav category={category} />
        </div>
      )}
      <Suspense fallback={<div className="py-12 text-center text-slate-400">Loading listings...</div>}>
        <InvestListingsClient listings={listings} categories={categoryTabs} initialCategory="infrastructure" />
      </Suspense>
    </>
  );
}
