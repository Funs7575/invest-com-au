import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { getAllInvestCategories, getInvestCategoryBySlug } from "@/lib/invest-categories";
import {
  fetchListingsByVertical,
  countListingsByVertical,
} from "@/lib/investment-listings-query";
import InvestListingsClient from "@/components/InvestListingsClient";
import DirectoryHero from "@/components/directory/DirectoryHero";
import SubCategoryNav from "@/components/SubCategoryNav";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const count = await countListingsByVertical("mining");
  const countLabel = count > 0 ? `${count} ` : "";
  return {
    title: `Mining Investment Opportunities Australia — ${countLabel}Listings (${CURRENT_YEAR})`,
    description:
      "Browse Australian mining investment opportunities. Filter by commodity (lithium, gold, copper, iron ore, rare earths), project stage, and state.",
    alternates: { canonical: `${SITE_URL}/invest/mining/listings` },
    openGraph: {
      title: `Mining Investment Opportunities Australia — ${countLabel}Active Listings`,
      url: `${SITE_URL}/invest/mining/listings`,
      images: [{ url: `/api/og?title=${encodeURIComponent("Mining Investment Opportunities Australia")}&sub=${encodeURIComponent("Gold · Lithium · Copper · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
    },
  };
}

export default async function MiningOpportunitiesPage() {
  const listings = await fetchListingsByVertical("mining");
  const categoryTabs = getAllInvestCategories().map((c) => ({ slug: c.slug, label: c.label }));
  const category = getInvestCategoryBySlug("mining");

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Mining", url: `${SITE_URL}/invest/mining` },
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
        breadcrumbLabel="Mining / Listings"
        headlineLead="Mining"
        headlineAccent="opportunities"
        subtitle="Browse Australian mining investment opportunities — filter by commodity (lithium, gold, copper, iron ore, rare earths), project stage and state."
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
          lockedCategory="mining"
          // Mirrors the SubCategoryNav render condition above — when the tab
          // bar shows, the in-results chips would duplicate it.
          hideSubCategoryChips={Boolean(category && category.subcategories.length > 0)}
        />
      </Suspense>
    </>
  );
}
