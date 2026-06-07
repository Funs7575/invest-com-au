import type { Metadata } from "next";
import { Suspense } from "react";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { getAllInvestCategories } from "@/lib/invest-categories";
import {
  fetchListingsByVertical,
  countListingsByVertical,
} from "@/lib/investment-listings-query";
import InvestListingsClient from "@/components/InvestListingsClient";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const count = await countListingsByVertical("insurance-linked-securities");
  const countLabel = count > 0 ? `${count} ` : "";
  return {
    title: `Insurance-Linked Securities (ILS) Investment Opportunities Australia — ${countLabel}Listings (${CURRENT_YEAR})`,
    description:
      "Browse Australian insurance-linked securities (ILS) investment opportunities for wholesale investors. Catastrophe bonds, sidecars, collateralised reinsurance and ILW structures. Non-correlated alternative yield.",
    alternates: { canonical: `${SITE_URL}/invest/insurance-linked-securities/listings` },
    // No live listings yet — de-indexed until supply threshold is met.
    // Remove when countListingsByVertical("insurance-linked-securities") > 0 in prod.
    robots: { index: false, follow: false },
    openGraph: {
      title: `Insurance-Linked Securities Investment Opportunities — ${countLabel}Active Listings`,
      url: `${SITE_URL}/invest/insurance-linked-securities/listings`,
      images: [{ url: `/api/og?title=${encodeURIComponent("ILS Investment Opportunities")}&sub=${encodeURIComponent("Active Listings · Australia · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
    },
  };
}

export default async function InsuranceLinkedSecuritiesListingsPage() {
  const listings = await fetchListingsByVertical("insurance-linked-securities");
  const categoryTabs = getAllInvestCategories().map((c) => ({ slug: c.slug, label: c.label }));

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Insurance-Linked Securities", url: `${SITE_URL}/invest/insurance-linked-securities` },
    { name: "Opportunities" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <div className="bg-amber-50 border border-amber-200 rounded-lg mx-4 mt-6 p-4 text-sm text-amber-900">
        <p className="font-semibold mb-1">⚠️ Wholesale Investor Access Required (s708 Corporations Act)</p>
        <p className="mb-2">
          Insurance-linked securities (ILS) listed here are only available to{" "}
          <strong>wholesale (sophisticated) investors</strong> under s708 of the Corporations Act 2001.
          ILS returns depend on catastrophe event frequency and severity — capital can be lost if a trigger event occurs.
          To qualify as a wholesale investor you must meet one of:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Net assets of at least <strong>$2.5 million</strong>; or</li>
          <li>Gross income of at least <strong>$250,000</strong> per year for each of the last 2 financial years; or</li>
          <li>A certificate from a <strong>qualified accountant</strong> confirming wholesale investor status (valid ≤ 2 years).</li>
        </ul>
        <p className="mt-2 text-xs text-amber-700">
          This is general information only and not personal financial advice. Confirm your eligibility with a qualified professional before investing.
        </p>
      </div>
      <Suspense fallback={<div className="py-12 text-center text-slate-400">Loading listings...</div>}>
        <InvestListingsClient
          listings={listings}
          categories={categoryTabs}
          lockedCategory="insurance-linked-securities"
          pageTitle="Insurance-Linked Securities Listings"
          pageSubtitle="Browse Australian insurance-linked securities investment opportunities — catastrophe bonds, reinsurance sidecars, collateralised reinsurance and industry loss warranty structures for wholesale investors seeking non-correlated yield."
        />
      </Suspense>
    </>
  );
}
