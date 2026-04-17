import type { Metadata } from "next";
import { Suspense } from "react";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import type { InvestmentListing } from "@/components/ListingCard";
import { fetchListingsByVertical } from "@/lib/investment-listings-query";
import FundsPageClient from "./FundsPageClient";

export const revalidate = 300;

export const metadata: Metadata = {
  title: `Australian Investment Fund Directory — SIV Complying Funds (${CURRENT_YEAR})`,
  description:
    "Browse ASIC-regulated Australian investment funds including SIV-complying funds for Significant Investor Visa applicants. Mining, agricultural, property, and infrastructure funds.",
  alternates: { canonical: `${SITE_URL}/invest/funds` },
  openGraph: {
    title: `Australian Investment Fund Directory — SIV Complying Funds (${CURRENT_YEAR})`,
    description:
      "Browse ASIC-regulated Australian investment funds including SIV-complying funds for Significant Investor Visa applicants.",
    url: `${SITE_URL}/invest/funds`,
  },
};

export default async function FundsPage() {
  // fetchListingsByVertical returns [] on any DB failure, so the
  // page always returns 200 with FundsPageClient gracefully showing
  // an empty directory.
  const listings = (await fetchListingsByVertical("fund")) as InvestmentListing[];

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Investment Funds" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <Suspense fallback={<div className="min-h-screen" />}>
        <FundsPageClient listings={listings} />
      </Suspense>
    </>
  );
}
