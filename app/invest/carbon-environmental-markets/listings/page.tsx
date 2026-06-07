import type { Metadata } from "next";
import { Suspense } from "react";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { getAllInvestCategories } from "@/lib/invest-categories";
import {
  fetchListingsByVertical,
  countListingsByVertical,
} from "@/lib/investment-listings-query";
import InvestListingsClient from "@/components/InvestListingsClient";
import ListingComplianceNotice from "@/components/invest/ListingComplianceNotice";
import WholesaleAttestationGate from "@/components/invest/WholesaleAttestationGate";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const count = await countListingsByVertical("carbon-environmental-markets");
  const countLabel = count > 0 ? `${count} ` : "";
  return {
    title: `Carbon & Environmental Markets Investment Australia — ${countLabel}Listings (${CURRENT_YEAR})`,
    description:
      "Browse Australian carbon and environmental market investment opportunities. ACCUs, voluntary carbon credits, biodiversity offsets, carbon farming projects, reforestation and land restoration assets.",
    alternates: { canonical: `${SITE_URL}/invest/carbon-environmental-markets/listings` },
    // ACCUs are financial products under the Corporations Act 2001 and may
    // trigger MIS licensing rules. Pending legal sign-off this vertical is
    // de-indexed and shows a wholesale (s708) gate. Re-enable indexing only
    // after compliance review (see MM-marketplace-expansion-plan.md § MM-V03).
    robots: { index: false, follow: false },
    openGraph: {
      title: `Carbon & Environmental Markets Investment Australia — ${countLabel}Active Listings`,
      url: `${SITE_URL}/invest/carbon-environmental-markets/listings`,
      images: [{ url: `/api/og?title=${encodeURIComponent("Carbon & Environmental Market Opportunities")}&sub=${encodeURIComponent("Active Listings · Australia · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
    },
  };
}

export default async function CarbonEnvironmentalMarketsListingsPage() {
  const listings = await fetchListingsByVertical("carbon-environmental-markets");
  const categoryTabs = getAllInvestCategories().map((c) => ({ slug: c.slug, label: c.label }));

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Carbon & Environmental Markets", url: `${SITE_URL}/invest/carbon-environmental-markets` },
    { name: "Opportunities" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <ListingComplianceNotice
        productLabel="Australian Carbon Credit Units (ACCUs) and related environmental-market products"
        classification="ACCUs are financial products under the Corporations Act 2001."
      />
      {/* C9: these offers may be regulated financial products / managed
          investment schemes. Gate the listings (and their inline enquiry CTAs)
          behind a wholesale (s708) self-attestation before they render. The
          gate also surfaces the GENERAL_ADVICE_WARNING. */}
      <div className="mx-4 mt-6">
        <WholesaleAttestationGate productLabel="these carbon & environmental-market opportunities">
          <Suspense fallback={<div className="py-12 text-center text-slate-400">Loading listings...</div>}>
            <InvestListingsClient
              listings={listings}
              categories={categoryTabs}
              lockedCategory="carbon-environmental-markets"
              pageTitle="Carbon & Environmental Markets Investment Listings"
              pageSubtitle="Browse Australian carbon and environmental market investment opportunities — ACCUs, voluntary carbon credits, biodiversity offsets, carbon farming projects and nature-positive assets."
            />
          </Suspense>
        </WholesaleAttestationGate>
      </div>
    </>
  );
}
