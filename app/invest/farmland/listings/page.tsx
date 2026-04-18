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
  const count = await countListingsByVertical("farmland");
  const countLabel = count > 0 ? `${count} ` : "";
  return {
    title: `Farmland for Sale Australia — ${countLabel}Agricultural Properties (${CURRENT_YEAR})`,
    description:
      "Browse Australian farmland and agricultural properties for sale. Filter by state, property type (grazing, cropping, dairy, horticulture), and size. FIRB-eligible listings highlighted.",
    alternates: { canonical: `${SITE_URL}/invest/farmland/listings` },
    openGraph: {
      title: `Farmland for Sale Australia — ${countLabel}Agricultural Properties`,
      url: `${SITE_URL}/invest/farmland/listings`,
    },
  };
}

export default async function FarmlandListingsPage() {
  const listings = await fetchListingsByVertical("farmland");
  const categoryTabs = getAllInvestCategories().map((c) => ({ slug: c.slug, label: c.label }));
  const category = getInvestCategoryBySlug("farmland");

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Farmland", url: `${SITE_URL}/invest/farmland` },
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
        <InvestListingsClient listings={listings} categories={categoryTabs} initialCategory="farmland" />
      </Suspense>
    </>
  );
}
