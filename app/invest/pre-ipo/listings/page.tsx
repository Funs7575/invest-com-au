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
import Icon from "@/components/Icon";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const count = await countListingsByVertical("pre_ipo");
  const countLabel = count > 0 ? `${count} ` : "";
  return {
    title: `Pre-IPO Investment Opportunities Australia — ${countLabel}Wholesale Deals (${CURRENT_YEAR})`,
    description:
      "Browse Australian pre-IPO opportunities — late-stage private placements, secondary share buys and broker-syndicated rounds. Wholesale and sophisticated investors only (s708).",
    alternates: { canonical: `${SITE_URL}/invest/pre-ipo/listings` },
    openGraph: {
      title: `Pre-IPO Investment Opportunities Australia — ${countLabel}Wholesale Deals`,
      url: `${SITE_URL}/invest/pre-ipo/listings`,
    },
  };
}

export default async function PreIpoOpportunitiesPage() {
  const listings = await fetchListingsByVertical("pre_ipo");
  const categoryTabs = getAllInvestCategories().map((c) => ({ slug: c.slug, label: c.label }));

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Pre-IPO", url: `${SITE_URL}/invest/pre-ipo` },
    { name: "Opportunities" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      <section className="bg-red-50 border-b-2 border-red-200 py-6">
        <div className="container-custom">
          <div className="flex items-start gap-3 max-w-4xl">
            <div className="w-10 h-10 rounded-lg bg-red-200 flex items-center justify-center shrink-0 mt-0.5">
              <Icon name="shield" size={20} className="text-red-800" />
            </div>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wide text-red-800 mb-1">
                Wholesale &amp; Sophisticated Investors Only
              </p>
              <p className="text-sm text-red-900 leading-relaxed">
                Pre-IPO opportunities are private placements relying on the s708(8)–(11)
                exemptions of the Corporations Act 2001 (Cth). Retail investors cannot
                access these deals directly. Information is general only — not financial
                advice and not an offer to subscribe.{" "}
                <Link href="/invest/pre-ipo" className="font-bold underline hover:text-red-700">
                  Read the wholesale-investor requirements
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </section>

      <Suspense fallback={<div className="py-12 text-center text-slate-400">Loading listings...</div>}>
        <InvestListingsClient
          listings={listings}
          categories={categoryTabs}
          lockedCategory="pre-ipo"
          pageTitle="Pre-IPO Investment Listings"
          pageSubtitle="Browse Australian late-stage private deals — convertible notes, preference share rounds, secondary share buys and broker-syndicated pre-IPO placements. Wholesale and sophisticated investors only."
        />
      </Suspense>
    </>
  );
}
