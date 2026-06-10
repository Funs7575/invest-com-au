import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { getAllInvestCategories } from "@/lib/invest-categories";
import {
  fetchListingsByVertical,
  countListingsByVertical,
} from "@/lib/investment-listings-query";
import InvestListingsClient from "@/components/InvestListingsClient";
import DirectoryHero from "@/components/directory/DirectoryHero";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const count = await countListingsByVertical("venture-capital");
  const countLabel = count > 0 ? `${count} ` : "";
  return {
    title: `Venture Capital Investment Opportunities Australia — ${countLabel}Listings (${CURRENT_YEAR})`,
    description:
      "Browse Australian VC opportunities for wholesale investors. Early-stage, Series A/B and growth equity. Compare structures, sector focus and minimums.",
    alternates: { canonical: `${SITE_URL}/invest/venture-capital/listings` },
    // No live listings yet — de-indexed until supply threshold is met.
    // Remove when countListingsByVertical("venture-capital") > 0 in prod.
    robots: { index: false, follow: false },
    openGraph: {
      title: `Venture Capital Investment Opportunities — ${countLabel}Active Listings`,
      url: `${SITE_URL}/invest/venture-capital/listings`,
      images: [{ url: `/api/og?title=${encodeURIComponent("Venture Capital Investment Opportunities")}&sub=${encodeURIComponent("Active Listings · Australia · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
    },
  };
}

export default async function VentureCapitalListingsPage() {
  const listings = await fetchListingsByVertical("venture-capital");
  const categoryTabs = getAllInvestCategories().map((c) => ({ slug: c.slug, label: c.label }));

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Venture Capital", url: `${SITE_URL}/invest/venture-capital` },
    { name: "Opportunities" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {/* House-standard compact light header (E7) — replaces the client's
          tall page-title band so results land near the fold. */}
      <DirectoryHero
        tone="light"
        breadcrumbLabel="Venture Capital / Listings"
        headlineLead="Venture capital"
        headlineAccent="opportunities"
        subtitle="Browse Australian venture capital investment opportunities — early-stage, growth and sector-focused VC fund mandates for wholesale investors. Compare sector focus, vintage year, fund size and minimum commitment."
        stats={listings.length > 0 ? [{ v: String(listings.length), l: "Live listings" }] : undefined}
        containerClassName="container-custom"
      >
        <Link
          href="/invest"
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-[0.65rem] font-semibold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 md:text-xs"
        >
          ← Browse all investment sectors
        </Link>
      </DirectoryHero>
      <div className="bg-amber-50 border border-amber-200 rounded-lg mx-4 mt-6 p-4 text-sm text-amber-900">
        <p className="font-semibold mb-1">⚠️ Wholesale Investor Access Required (s708 Corporations Act)</p>
        <p className="mb-2">
          Venture capital fund investments listed here are only available to{" "}
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
          lockedCategory="venture-capital"
        />
      </Suspense>
    </>
  );
}
