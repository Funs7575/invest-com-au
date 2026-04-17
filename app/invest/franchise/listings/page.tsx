import type { Metadata } from "next";
import { Suspense } from "react";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { getAllInvestCategories, getInvestCategoryBySlug } from "@/lib/invest-categories";
import {
  fetchListingsByVertical,
  countListingsByVertical,
} from "@/lib/investment-listings-query";
import InvestListingsClient from "@/components/InvestListingsClient";
import SubCategoryNav from "@/components/SubCategoryNav";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const count = await countListingsByVertical("franchise");
  const countLabel = count > 0 ? `${count} ` : "";
  return {
    title: `Franchise Opportunities Australia — ${countLabel}Available Territories (${CURRENT_YEAR})`,
    description:
      "Browse available franchise territories in Australia. Filter by industry (food, fitness, cleaning, automotive, retail, education) and investment level.",
    alternates: { canonical: `${SITE_URL}/invest/franchise/listings` },
    openGraph: {
      title: `Franchise Opportunities Australia — ${countLabel}Available Territories`,
      url: `${SITE_URL}/invest/franchise/listings`,
    },
  };
}

export default async function FranchiseListingsPage() {
  const listings = await fetchListingsByVertical("franchise");
  const categoryTabs = getAllInvestCategories().map((c) => ({ slug: c.slug, label: c.label }));
  const category = getInvestCategoryBySlug("franchise");

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Franchise", url: `${SITE_URL}/invest/franchise` },
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
        <InvestListingsClient listings={listings} categories={categoryTabs} initialCategory="franchise" />
      </Suspense>
    </>
  );
}
