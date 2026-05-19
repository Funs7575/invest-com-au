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
  const [peCount, hfCount] = await Promise.all([
    countListingsByVertical("private-equity"),
    countListingsByVertical("hedge-fund"),
  ]);
  const count = peCount + hfCount;
  const countLabel = count > 0 ? `${count} ` : "";
  return {
    title: `Private Equity & Hedge Fund Investment Opportunities Australia — ${countLabel}Listings (${CURRENT_YEAR})`,
    description:
      "Browse Australian private equity and hedge fund investment opportunities. Wholesale investor access (s708 Corporations Act). Compare structures, target returns, minimum investment and manager track records.",
    alternates: { canonical: `${SITE_URL}/invest/private-equity/listings` },
    openGraph: {
      title: `Private Equity & Hedge Fund Investment Opportunities — ${countLabel}Active Listings`,
      url: `${SITE_URL}/invest/private-equity/listings`,
    },
  };
}

export default async function PrivateEquityListingsPage() {
  const [peListings, hfListings] = await Promise.all([
    fetchListingsByVertical("private-equity"),
    fetchListingsByVertical("hedge-fund"),
  ]);
  const listings = [...peListings, ...hfListings];
  const categoryTabs = getAllInvestCategories().map((c) => ({ slug: c.slug, label: c.label }));

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Private Equity & Hedge Funds", url: `${SITE_URL}/invest/private-equity` },
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
          Private equity and hedge fund investments listed here are only available to{" "}
          <strong>wholesale (sophisticated) investors</strong> under s708 of the Corporations Act 2001.
          To qualify you must meet one of:
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
          lockedCategory="private-equity"
          pageTitle="Private Equity & Hedge Fund Listings"
          pageSubtitle="Browse Australian private equity and hedge fund investment opportunities — direct fund investments, fund-of-funds, co-investment structures and separately managed accounts for wholesale investors."
        />
      </Suspense>
    </>
  );
}
