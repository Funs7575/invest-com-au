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
  const count = await countListingsByVertical("litigation-funding");
  const countLabel = count > 0 ? `${count} ` : "";
  return {
    title: `Litigation Funding Investment Opportunities Australia — ${countLabel}Listings (${CURRENT_YEAR})`,
    description:
      "Browse Australian litigation funding investment opportunities for wholesale investors. Class actions, commercial disputes and international arbitration funding. Compare expected returns, case portfolios and funding structures.",
    alternates: { canonical: `${SITE_URL}/invest/litigation-funding/listings` },
    // No live listings yet — de-indexed until supply threshold is met.
    // Remove when countListingsByVertical("litigation-funding") > 0 in prod.
    robots: { index: false, follow: false },
    openGraph: {
      title: `Litigation Funding Investment Opportunities — ${countLabel}Active Listings`,
      url: `${SITE_URL}/invest/litigation-funding/listings`,
      images: [{ url: `/api/og?title=${encodeURIComponent("Litigation Funding Opportunities")}&sub=${encodeURIComponent("Active Listings · Australia · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
    },
  };
}

export default async function LitigationFundingListingsPage() {
  const listings = await fetchListingsByVertical("litigation-funding");
  const categoryTabs = getAllInvestCategories().map((c) => ({ slug: c.slug, label: c.label }));

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Litigation Funding", url: `${SITE_URL}/invest/litigation-funding` },
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
          Litigation funding investments listed here are only available to{" "}
          <strong>wholesale (sophisticated) investors</strong> under s708 of the Corporations Act 2001.
          Litigation funding carries binary risk — returns depend on case outcomes and settlement timing.
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
          lockedCategory="litigation-funding"
          pageTitle="Litigation Funding Investment Listings"
          pageSubtitle="Browse Australian litigation funding investment opportunities — class action portfolios, commercial dispute funding, international arbitration and single-case structures for wholesale investors."
        />
      </Suspense>
    </>
  );
}
