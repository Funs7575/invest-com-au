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
  const count = await countListingsByVertical("startup");
  const countLabel = count > 0 ? `${count} ` : "";
  return {
    title: `Startup Investment Opportunities Australia — ${countLabel}Listings (${CURRENT_YEAR})`,
    description:
      "Browse Australian startups raising capital. Filter by sector, stage, and ESIC eligibility. Angel, seed, and Series A opportunities.",
    alternates: { canonical: `${SITE_URL}/invest/startups/listings` },
    openGraph: {
      title: `Startup Investment Opportunities Australia — ${countLabel}Listings`,
      url: `${SITE_URL}/invest/startups/listings`,
      images: [{ url: `/api/og?title=${encodeURIComponent("Startup Investment Opportunities")}&sub=${encodeURIComponent("Seed · Series A · ESIC-Eligible · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
    },
  };
}

export default async function StartupOpportunitiesPage() {
  const listings = await fetchListingsByVertical("startup");
  const categoryTabs = getAllInvestCategories().map((c) => ({ slug: c.slug, label: c.label }));
  const category = getInvestCategoryBySlug("startups");

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Startups", url: `${SITE_URL}/invest/startups` },
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
        breadcrumbLabel="Startups / Listings"
        headlineLead="Startups & tech"
        headlineAccent="opportunities"
        subtitle="Browse Australian startup investment opportunities — VC, angel rounds, SAFE notes and equity crowdfunding."
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
      <Suspense fallback={<div className="py-12 text-center text-slate-500">Loading listings...</div>}>
        <InvestListingsClient
          listings={listings}
          categories={categoryTabs}
          lockedCategory="startups"
        />
      </Suspense>
    </>
  );
}
