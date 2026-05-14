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
  const count = await countListingsByVertical("aquaculture");
  const countLabel = count > 0 ? `${count} ` : "";
  return {
    title: `Aquaculture & Marine Investment Opportunities Australia — ${countLabel}Listings (${CURRENT_YEAR})`,
    description:
      "Browse Australian aquaculture and marine investment opportunities. Salmon farming, oyster leases, abalone, prawn farming, mussel cultivation, land-based recirculating aquaculture systems and fishing licences available for investment.",
    alternates: { canonical: `${SITE_URL}/invest/aquaculture/listings` },
    openGraph: {
      title: `Aquaculture & Marine Investment Opportunities Australia — ${countLabel}Active Listings`,
      url: `${SITE_URL}/invest/aquaculture/listings`,
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
      <Suspense fallback={<div className="py-12 text-center text-slate-400">Loading listings...</div>}>
        <InvestListingsClient
          listings={listings}
          categories={categoryTabs}
          lockedCategory="aquaculture"
          pageTitle="Aquaculture & Marine Investment Listings"
          pageSubtitle="Browse Australian aquaculture and marine investment opportunities — salmon farming operations, oyster leases, abalone farms, prawn aquaculture, mussel cultivation, land-based RAS facilities and fishing quota."
        />
      </Suspense>
    </>
  );
}
