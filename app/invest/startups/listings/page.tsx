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
  const count = await countListingsByVertical("startup");
  const countLabel = count > 0 ? `${count} ` : "";
  return {
    title: `Startup Investment Opportunities Australia — ${countLabel}Listings (${CURRENT_YEAR})`,
    description:
      "Browse Australian startups raising capital. Filter by sector, stage, and ESIC eligibility. Angel, seed, and Series A opportunities.",
    alternates: { canonical: `${SITE_URL}/invest/startups/listings` },
    openGraph: {
      title: `Startup Investment Opportunities Australia — ${countLabel}Listings`,
      url: `${SITE_URL}/invest/startups/listings`,
    },
  };
}

export default async function StartupOpportunitiesPage() {
  const listings = await fetchListingsByVertical("startup");
  const categoryTabs = getAllInvestCategories().map((c) => ({ slug: c.slug, label: c.label }));
  const category = getInvestCategoryBySlug("startups");

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Startups", url: `${SITE_URL}/invest/startups` },
    { name: "Opportunities" },
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
          lockedCategory="startups"
          pageTitle="Startups & Tech Investment Listings"
          pageSubtitle="Browse Australian startup investment opportunities — VC, angel rounds, SAFE notes and equity crowdfunding."
        />
      </Suspense>
    </>
  );
}
