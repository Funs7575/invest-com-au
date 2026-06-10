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
  const count = await countListingsByVertical("commercial_property");
  const countLabel = count > 0 ? `${count} ` : "";
  return {
    title: `Commercial Property for Sale Australia — ${countLabel}Listings (${CURRENT_YEAR})`,
    description:
      "Australian commercial properties for sale. Office, industrial, retail, and hotel assets with yield data. Filter by city, property type, and yield range.",
    alternates: { canonical: `${SITE_URL}/invest/commercial-property/listings` },
    openGraph: {
      title: `Commercial Property for Sale Australia — ${countLabel}Active Listings`,
      url: `${SITE_URL}/invest/commercial-property/listings`,
      images: [{ url: `/api/og?title=${encodeURIComponent("Commercial Property Investment Opportunities")}&sub=${encodeURIComponent("Active Listings · Australia · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
    },
  };
}

export default async function CommercialListingsPage() {
  const listings = await fetchListingsByVertical("commercial_property");
  const categoryTabs = getAllInvestCategories().map((c) => ({ slug: c.slug, label: c.label }));
  const category = getInvestCategoryBySlug("commercial-property");

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Commercial Property", url: `${SITE_URL}/invest/commercial-property` },
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
        breadcrumbLabel="Commercial Property / Listings"
        headlineLead="Commercial property"
        headlineAccent="opportunities"
        subtitle="Browse Australian commercial property investment opportunities — office, industrial, retail, healthcare and childcare."
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
          lockedCategory="commercial-property"
        />
      </Suspense>
    </>
  );
}
