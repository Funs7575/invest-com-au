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
  const count = await countListingsByVertical("commercial_property");
  const countLabel = count > 0 ? `${count} ` : "";
  return {
    title: `Commercial Property for Sale Australia — ${countLabel}Listings (${CURRENT_YEAR})`,
    description:
      "Browse Australian commercial properties for sale. Office, industrial, retail, and hotel assets with yield data. Filter by city, property type, and yield range.",
    alternates: { canonical: `${SITE_URL}/invest/commercial-property/listings` },
    openGraph: {
      title: `Commercial Property for Sale Australia — ${countLabel}Active Listings`,
      url: `${SITE_URL}/invest/commercial-property/listings`,
    },
  };
}

export default async function CommercialListingsPage() {
  const listings = await fetchListingsByVertical("commercial_property");
  const categoryTabs = getAllInvestCategories().map((c) => ({ slug: c.slug, label: c.label }));
  const category = getInvestCategoryBySlug("commercial-property");

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Commercial Property", url: `${SITE_URL}/invest/commercial-property` },
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
        <InvestListingsClient
          listings={listings}
          categories={categoryTabs}
          lockedCategory="commercial-property"
          pageTitle="Commercial Property Investment Listings"
          pageSubtitle="Browse Australian commercial property investment opportunities — office, industrial, retail, healthcare and childcare."
        />
      </Suspense>
    </>
  );
}
