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
  const count = await countListingsByVertical("livestock");
  const countLabel = count > 0 ? `${count} ` : "";
  return {
    title: `Livestock & Equine Investment Opportunities Australia — ${countLabel}Listings (${CURRENT_YEAR})`,
    description:
      "Browse Australian livestock and equine investment opportunities. Thoroughbred racehorse syndications, cattle herd investments, sheep and wool programs, stud breeding rights and equine genetic programs available for investment.",
    alternates: { canonical: `${SITE_URL}/invest/livestock/listings` },
    openGraph: {
      title: `Livestock & Equine Investment Opportunities Australia — ${countLabel}Active Listings`,
      url: `${SITE_URL}/invest/livestock/listings`,
    },
  };
}

export default async function LivestockListingsPage() {
  const listings = await fetchListingsByVertical("livestock");
  const categoryTabs = getAllInvestCategories().map((c) => ({ slug: c.slug, label: c.label }));

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Livestock & Equine", url: `${SITE_URL}/invest/livestock` },
    { name: "Opportunities" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <Suspense fallback={<div className="py-12 text-center text-slate-400">Loading listings...</div>}>
        <InvestListingsClient
          listings={listings}
          categories={categoryTabs}
          lockedCategory="livestock"
          pageTitle="Livestock & Equine Investment Listings"
          pageSubtitle="Browse Australian livestock and equine investment opportunities — thoroughbred racehorse syndications via Magic Millions and Inglis, cattle herd programs, sheep and wool breeding, stud rights and genetic investment programs."
        />
      </Suspense>
    </>
  );
}
