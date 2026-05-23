import type { Metadata } from "next";
import { Suspense } from "react";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { getAllInvestCategories } from "@/lib/invest-categories";
import {
  fetchListingsByVertical,
  countListingsByVertical,
} from "@/lib/investment-listings-query";
import InvestListingsClient from "@/components/InvestListingsClient";
import ListingComplianceNotice from "@/components/invest/ListingComplianceNotice";
import WholesaleAttestationGate from "@/components/invest/WholesaleAttestationGate";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const count = await countListingsByVertical("livestock");
  const countLabel = count > 0 ? `${count} ` : "";
  return {
    title: `Livestock & Equine Investment Opportunities Australia — ${countLabel}Listings (${CURRENT_YEAR})`,
    description:
      "Browse Australian livestock and equine investment opportunities. Thoroughbred racehorse syndications, cattle herd investments, sheep and wool programs, stud breeding rights and equine genetic programs available for investment.",
    alternates: { canonical: `${SITE_URL}/invest/livestock/listings` },
    // Livestock/equine syndications are commonly regulated managed investment
    // schemes. De-indexed with a wholesale (s708) gate pending compliance
    // review; re-enable indexing only after legal sign-off.
    robots: { index: false, follow: false },
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
      <ListingComplianceNotice
        productLabel="livestock and equine investment opportunities (including racehorse and breeding syndications)"
        classification="Livestock and equine syndications listed here are commonly regulated managed investment schemes."
      />
      {/* C9: these offers may be regulated financial products / managed
          investment schemes. Gate the listings (and their inline enquiry CTAs)
          behind a wholesale (s708) self-attestation before they render. The
          gate also surfaces the GENERAL_ADVICE_WARNING. */}
      <div className="mx-4 mt-6">
        <WholesaleAttestationGate productLabel="these livestock & equine opportunities">
          <Suspense fallback={<div className="py-12 text-center text-slate-400">Loading listings...</div>}>
            <InvestListingsClient
              listings={listings}
              categories={categoryTabs}
              lockedCategory="livestock"
              pageTitle="Livestock & Equine Investment Listings"
              pageSubtitle="Browse Australian livestock and equine investment opportunities — thoroughbred racehorse syndications via Magic Millions and Inglis, cattle herd programs, sheep and wool breeding, stud rights and genetic investment programs."
            />
          </Suspense>
        </WholesaleAttestationGate>
      </div>
    </>
  );
}
