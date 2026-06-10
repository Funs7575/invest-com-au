import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { getAllInvestCategories, getInvestCategoryBySlug } from "@/lib/invest-categories";
import {
  fetchListingsByVertical,
  countListingsByVertical,
  ALTERNATIVES_SUB_CATEGORIES,
} from "@/lib/investment-listings-query";
import InvestListingsClient from "@/components/InvestListingsClient";
import DirectoryHero from "@/components/directory/DirectoryHero";
import SubCategoryNav from "@/components/SubCategoryNav";

export const revalidate = 300;

// Alternatives aren't their own DB vertical — they're `fund` rows
// whose sub_category identifies them as a collectible asset (wine,
// art, classic cars, etc.). See lib/listing-url.ts FUND_SUB_TO_CATEGORY
// for the canonical mapping.

export async function generateMetadata(): Promise<Metadata> {
  const count = await countListingsByVertical("fund", {
    subCategories: ALTERNATIVES_SUB_CATEGORIES,
  });
  const countLabel = count > 0 ? `${count} ` : "";
  return {
    title: `Alternative Investments Australia — Browse ${countLabel}Listings (${CURRENT_YEAR})`,
    description:
      "Discover alternative investment opportunities in Australia. Wine, art, classic cars, watches, coins, whisky and more collectible assets.",
    alternates: { canonical: `${SITE_URL}/invest/alternatives/listings` },
    openGraph: {
      title: `Alternative Investments Australia — ${countLabel}Active Listings`,
      description:
        "Discover alternative investment opportunities in Australia. Wine, art, classic cars, watches, coins, whisky and more.",
      url: `${SITE_URL}/invest/alternatives/listings`,
      images: [{ url: `/api/og?title=${encodeURIComponent("Alternative Investment Opportunities")}&sub=${encodeURIComponent("Current Deals · Private Credit · PE · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
    },
  };
}

export default async function AlternativesListingsPage() {
  const listings = await fetchListingsByVertical("fund", {
    subCategories: ALTERNATIVES_SUB_CATEGORIES,
  });
  const categoryTabs = getAllInvestCategories().map((c) => ({ slug: c.slug, label: c.label }));
  const category = getInvestCategoryBySlug("alternatives");

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Alternative Investments", url: `${SITE_URL}/invest/alternatives` },
    { name: "Listings" },
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
        breadcrumbLabel="Alternative Investments / Listings"
        headlineLead="Alternative investment"
        headlineAccent="opportunities"
        subtitle="Browse Australian alternative investment opportunities — art, wine, collectibles and non-correlated assets."
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
      {category && (
        <div className="container-custom pt-4">
          <SubCategoryNav category={category} />
        </div>
      )}
      <Suspense fallback={<div className="py-12 text-center text-slate-400">Loading listings...</div>}>
        <InvestListingsClient
          listings={listings}
          categories={categoryTabs}
          lockedCategory="alternatives"
        />
      </Suspense>
    </>
  );
}
