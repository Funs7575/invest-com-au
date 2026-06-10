import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { getAllInvestCategories, getInvestCategoryBySlug } from "@/lib/invest-categories";
import { fetchListingsByKind, countListingsByKind } from "@/lib/investment-listings-query";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import InvestListingsClient from "@/components/InvestListingsClient";
import DirectoryHero from "@/components/directory/DirectoryHero";
import Icon from "@/components/Icon";

export const revalidate = 300;

// Grouped by instrument kind, not vertical — ASX-listed securities span
// uranium / hydrogen / oil-gas / … verticals. categoryForListing routes
// listing_kind="listed_security" to the "listed-securities" category.
const KIND = "listed_security";

export async function generateMetadata(): Promise<Metadata> {
  const cat = getInvestCategoryBySlug("listed-securities");
  const count = await countListingsByKind(KIND);
  const countLabel = count > 0 ? `${count} ` : "";
  return {
    title: cat?.title ?? `ASX-Listed Securities (${CURRENT_YEAR})`,
    description: cat?.metaDescription,
    alternates: { canonical: `${SITE_URL}/invest/listed-securities/listings` },
    openGraph: {
      title: `ASX-Listed Securities by Theme — ${countLabel}Listings`,
      description: cat?.metaDescription,
      url: `${SITE_URL}/invest/listed-securities/listings`,
    },
  };
}

export default async function ListedSecuritiesPage() {
  const listings = await fetchListingsByKind(KIND);
  const categoryTabs = getAllInvestCategories().map((c) => ({ slug: c.slug, label: c.label }));
  const cat = getInvestCategoryBySlug("listed-securities");

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Listed Securities" },
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
        breadcrumbLabel="Listed Securities / Listings"
        headlineLead={cat?.h1 ?? "ASX-Listed Securities"}
        subtitle={cat?.intro}
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

      {/* Factual / general-information notice — these are public securities,
          not an offer or recommendation (lean lane per REGULATORY-AVOID-LIST). */}
      <div className="container-custom pt-4">
        <div className="flex gap-2.5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs leading-relaxed text-blue-800">
          <Icon name="shield-check" size={15} className="mt-0.5 shrink-0 text-blue-600" />
          <p>
            <strong className="font-semibold">General information only.</strong> These are publicly traded
            ASX-listed securities you buy through your own broker — we don&apos;t issue, sell, arrange or
            recommend them, and nothing here is an offer or a recommendation. {GENERAL_ADVICE_WARNING}{" "}
            <Link href="/how-we-earn" className="underline hover:no-underline">How we earn</Link>.
          </p>
        </div>
      </div>

      <Suspense fallback={<div className="py-12 text-center text-slate-400">Loading listings...</div>}>
        <InvestListingsClient
          listings={listings}
          categories={categoryTabs}
          lockedCategory="listed-securities"
        />
      </Suspense>
    </>
  );
}
