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
  const count = await countListingsByVertical("fund");
  const countLabel = count > 0 ? `${count} ` : "";
  return {
    title: `Fund Investment Opportunities Australia — ${countLabel}Managed, Syndicated & Wholesale Funds (${CURRENT_YEAR})`,
    description:
      "Browse Australian fund investments — managed funds, syndicated property funds, infrastructure and wholesale vehicles. Compare structures and minimums.",
    alternates: { canonical: `${SITE_URL}/invest/funds/listings` },
    openGraph: {
      title: `Fund Investment Opportunities Australia — ${countLabel}Active Listings`,
      url: `${SITE_URL}/invest/funds/listings`,
      images: [{ url: `/api/og?title=${encodeURIComponent("Managed Fund Listings")}&sub=${encodeURIComponent("Current Offers · Minimums · Returns · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
    },
  };
}

export default async function FundsListingsPage() {
  const listings = await fetchListingsByVertical("fund");
  const categoryTabs = getAllInvestCategories().map((c) => ({ slug: c.slug, label: c.label }));
  const category = getInvestCategoryBySlug("funds");

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Funds", url: `${SITE_URL}/invest/funds` },
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
          // Must be the category SLUG ("funds"), not the DB vertical ("fund").
          // InvestListingsClient filters client-side by
          // categoryForListing(l) === lockedCategory, and categoryForListing
          // returns the slug "funds" — so "fund" matched nothing and the page
          // rendered "0 listings" despite 78 fund rows.
          lockedCategory="funds"
          pageTitle="Fund Investment Listings"
          pageSubtitle="Browse Australian fund investment opportunities — managed funds, syndicated property funds, infrastructure funds and wholesale vehicles open to qualified investors."
        />
      </Suspense>
    </>
  );
}
