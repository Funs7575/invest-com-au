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
  const count = await countListingsByVertical("public-social-infrastructure");
  const countLabel = count > 0 ? `${count} ` : "";
  return {
    title: `Public & Social Infrastructure Investment Australia — ${countLabel}Listings (${CURRENT_YEAR})`,
    description:
      "Browse Australian public and social infrastructure investments — toll roads, water utilities, hospitals, schools, social housing and PPP assets.",
    alternates: { canonical: `${SITE_URL}/invest/public-social-infrastructure/listings` },
    openGraph: {
      title: `Public & Social Infrastructure Investment Australia — ${countLabel}Active Listings`,
      url: `${SITE_URL}/invest/public-social-infrastructure/listings`,
      images: [{ url: `/api/og?title=${encodeURIComponent("Social Infrastructure Investment Opportunities")}&sub=${encodeURIComponent("Active Listings · Australia · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
    },
  };
}

export default async function PublicSocialInfrastructureListingsPage() {
  const listings = await fetchListingsByVertical("public-social-infrastructure");
  const categoryTabs = getAllInvestCategories().map((c) => ({ slug: c.slug, label: c.label }));

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Public & Social Infrastructure", url: `${SITE_URL}/invest/public-social-infrastructure` },
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
        breadcrumbLabel="Public & Social Infrastructure / Listings"
        headlineLead="Public & social infrastructure"
        headlineAccent="opportunities"
        subtitle="Browse Australian public and social infrastructure investment opportunities — toll roads, water utilities, hospitals, schools, social housing and PPP availability-payment assets."
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
      <Suspense fallback={<div className="py-12 text-center text-slate-400">Loading listings...</div>}>
        <InvestListingsClient
          listings={listings}
          categories={categoryTabs}
          lockedCategory="public-social-infrastructure"
        />
      </Suspense>
    </>
  );
}
