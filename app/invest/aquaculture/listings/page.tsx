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
  const count = await countListingsByVertical("aquaculture");
  const countLabel = count > 0 ? `${count} ` : "";
  return {
    title: `Aquaculture & Marine Investment Opportunities Australia — ${countLabel}Listings (${CURRENT_YEAR})`,
    description:
      "Browse Australian aquaculture and marine investments. Salmon farming, oyster leases, abalone, prawn and mussel farming, land-based RAS, fishing licences.",
    alternates: { canonical: `${SITE_URL}/invest/aquaculture/listings` },
    // Aquaculture syndications/leases may be regulated managed investment
    // schemes. De-indexed with a wholesale (s708) gate pending compliance
    // review; re-enable indexing only after legal sign-off.
    robots: { index: false, follow: false },
    openGraph: {
      title: `Aquaculture & Marine Investment Opportunities Australia — ${countLabel}Active Listings`,
      url: `${SITE_URL}/invest/aquaculture/listings`,
      images: [{ url: `/api/og?title=${encodeURIComponent("Aquaculture Investment Opportunities")}&sub=${encodeURIComponent("Active Listings · Australia · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
    },
  };
}

export default async function AquacultureListingsPage() {
  const listings = await fetchListingsByVertical("aquaculture");
  const categoryTabs = getAllInvestCategories().map((c) => ({ slug: c.slug, label: c.label }));

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Aquaculture & Marine", url: `${SITE_URL}/invest/aquaculture` },
    { name: "Opportunities" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <ListingComplianceNotice
        productLabel="aquaculture and marine investment opportunities (including syndicated leases and farm operations)"
        classification="Aquaculture investments listed here may be regulated managed investment schemes."
      />
      {/* C9: these offers may be regulated financial products / managed
          investment schemes. Gate the listings (and their inline enquiry CTAs)
          behind a wholesale (s708) self-attestation before they render. The
          gate also surfaces the GENERAL_ADVICE_WARNING. */}
      <div className="mx-4 mt-6">
        <WholesaleAttestationGate productLabel="these aquaculture & marine opportunities">
          <Suspense fallback={<div className="py-12 text-center text-slate-400">Loading listings...</div>}>
            <InvestListingsClient
              listings={listings}
              categories={categoryTabs}
              lockedCategory="aquaculture"
              pageTitle="Aquaculture & Marine Investment Listings"
              pageSubtitle="Browse Australian aquaculture and marine investment opportunities — salmon farming operations, oyster leases, abalone farms, prawn aquaculture, mussel cultivation, land-based RAS facilities and fishing quota."
            />
          </Suspense>
        </WholesaleAttestationGate>
      </div>
    </>
  );
}
