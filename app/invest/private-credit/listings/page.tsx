import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { getAllInvestCategories, getInvestCategoryBySlug } from "@/lib/invest-categories";
import {
  fetchListingsByVertical,
  countListingsByVertical,
  PRIVATE_CREDIT_SUB_CATEGORIES,
} from "@/lib/investment-listings-query";
import InvestListingsClient from "@/components/InvestListingsClient";
import DirectoryHero from "@/components/directory/DirectoryHero";
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
      images: [{ url: `/api/og?title=${encodeURIComponent("Private Credit Opportunities")}&sub=${encodeURIComponent("Yield · Security · Terms · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
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
      {/* House-standard compact light header (E7) — replaces the client's
          tall page-title band so results land near the fold. */}
      <DirectoryHero
        tone="light"
        breadcrumbLabel="Private Credit / Listings"
        headlineLead="Private credit"
        headlineAccent="opportunities"
        subtitle="Browse Australian private credit investment opportunities — senior secured loans, mezzanine debt and structured credit."
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
          lockedCategory="private-credit"
          // Mirrors the SubCategoryNav render condition above — when the tab
          // bar shows, the in-results chips would duplicate it.
          hideSubCategoryChips={Boolean(category && category.subcategories.length > 0)}
        />
      </Suspense>
    </>
  );
}
