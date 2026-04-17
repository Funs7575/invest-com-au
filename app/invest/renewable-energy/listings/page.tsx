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
  const count = await countListingsByVertical("energy");
  const countLabel = count > 0 ? `${count} ` : "";
  return {
    title: `Renewable Energy Projects Australia — ${countLabel}Investment Opportunities (${CURRENT_YEAR})`,
    description:
      "Browse Australian renewable energy projects seeking investment. Filter by technology (solar, wind, battery, hydrogen), project stage, and state.",
    alternates: { canonical: `${SITE_URL}/invest/renewable-energy/listings` },
    openGraph: {
      title: `Renewable Energy Projects Australia — ${countLabel}Investment Opportunities`,
      url: `${SITE_URL}/invest/renewable-energy/listings`,
    },
  };
}

export default async function EnergyProjectsPage() {
  const listings = await fetchListingsByVertical("energy");
  const categoryTabs = getAllInvestCategories().map((c) => ({ slug: c.slug, label: c.label }));
  const category = getInvestCategoryBySlug("renewable-energy");

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Renewable Energy", url: `${SITE_URL}/invest/renewable-energy` },
    { name: "Projects" },
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
        <InvestListingsClient listings={listings} categories={categoryTabs} initialCategory="renewable-energy" />
      </Suspense>
    </>
  );
}
