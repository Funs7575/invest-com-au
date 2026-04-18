import type { Metadata } from "next";
import { Suspense } from "react";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { getAllInvestCategories, getInvestCategoryBySlug } from "@/lib/invest-categories";
import {
  fetchListingsByVertical,
  countListingsByVertical,
  PRIVATE_CREDIT_SUB_CATEGORIES,
} from "@/lib/investment-listings-query";
import InvestListingsClient from "@/components/InvestListingsClient";
import SubCategoryNav from "@/components/SubCategoryNav";

export const revalidate = 300;

// Private-credit listings live under vertical='fund' + sub_category='private_credit'.
// Old code queried vertical='private_credit' which isn't a valid vertical and
// always returned zero rows.

export async function generateMetadata(): Promise<Metadata> {
  const count = await countListingsByVertical("fund", {
    subCategories: PRIVATE_CREDIT_SUB_CATEGORIES,
  });
  const countLabel = count > 0 ? `${count} ` : "";
  return {
    title: `Private Credit Funds Australia — Browse ${countLabel}Listings (${CURRENT_YEAR})`,
    description:
      "Explore private credit investment opportunities in Australia. Senior secured, mezzanine, P2P lending, real estate debt and more.",
    alternates: { canonical: `${SITE_URL}/invest/private-credit/listings` },
    openGraph: {
      title: `Private Credit Funds Australia — ${countLabel}Active Listings`,
      description:
        "Explore private credit investment opportunities in Australia. Senior secured, mezzanine, P2P lending and more.",
      url: `${SITE_URL}/invest/private-credit/listings`,
    },
  };
}

export default async function PrivateCreditListingsPage() {
  const listings = await fetchListingsByVertical("fund", {
    subCategories: PRIVATE_CREDIT_SUB_CATEGORIES,
  });
  const categoryTabs = getAllInvestCategories().map((c) => ({ slug: c.slug, label: c.label }));
  const category = getInvestCategoryBySlug("private-credit");

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Private Credit", url: `${SITE_URL}/invest/private-credit` },
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
        <InvestListingsClient listings={listings} categories={categoryTabs} initialCategory="private-credit" />
      </Suspense>
    </>
  );
}
