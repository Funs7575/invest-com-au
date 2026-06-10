import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import {
  getAllInvestCategories,
  getInvestCategoryBySlug,
  getCategoryDbFilter,
} from "@/lib/invest-categories";
import {
  fetchListingsByVertical,
  countListingsByVertical,
} from "@/lib/investment-listings-query";
import type { InvestListingVertical } from "@/lib/types";
import InvestListingsClient from "@/components/InvestListingsClient";
import DirectoryHero from "@/components/directory/DirectoryHero";
import SubCategoryNav from "@/components/SubCategoryNav";

export const revalidate = 300;

// Fully dynamic (no generateStaticParams / dynamicParams). The 14 bespoke
// static `app/invest/<slug>/listings/page.tsx` pages take routing
// precedence; this generic route fills the gaps for opportunity sectors
// without one (income-assets, bullion, water-rights, carbon-credits,
// sda-housing). It previously set `dynamicParams = false`, but constraining
// the shared `[slug]` segment that way interacted badly with the nested
// `[subcategory]` route in production — removed. `notFound()` guards
// invalid slugs instead; `revalidate` caches the rendered pages.

/** Shared resolver: the category for this slug, or 404. */
function resolveCategory(slug: string) {
  const cat = getInvestCategoryBySlug(slug);
  if (!cat || cat.intent !== "opportunity") notFound();
  return cat;
}

/** Listings for a category via its canonical DB filter (alias-aware). */
async function fetchCategoryListings(slug: string) {
  const cat = resolveCategory(slug);
  const filter = getCategoryDbFilter(cat);
  const vertical = filter.verticals[0];
  if (!vertical) return [];
  return fetchListingsByVertical(
    vertical as InvestListingVertical,
    filter.subCategories ? { subCategories: filter.subCategories } : {},
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cat = getInvestCategoryBySlug(slug);
  if (!cat || cat.intent !== "opportunity") return { robots: { index: false } };

  const filter = getCategoryDbFilter(cat);
  const vertical = filter.verticals[0];
  const count = vertical
    ? await countListingsByVertical(
        vertical as InvestListingVertical,
        filter.subCategories ? { subCategories: filter.subCategories } : {},
      )
    : 0;
  const countLabel = count > 0 ? `${count} ` : "";

  return {
    title: cat.title,
    description: cat.metaDescription,
    alternates: { canonical: `${SITE_URL}/invest/${slug}/listings` },
    openGraph: {
      title: `${cat.label} Investment Opportunities — ${countLabel}Active Listings`,
      description: cat.metaDescription,
      url: `${SITE_URL}/invest/${slug}/listings`,
    },
  };
}

export default async function GenericCategoryListingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cat = resolveCategory(slug);
  const listings = await fetchCategoryListings(slug);
  const categoryTabs = getAllInvestCategories().map((c) => ({ slug: c.slug, label: c.label }));

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: cat.label, url: `${SITE_URL}/invest/${slug}` },
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
        breadcrumbLabel={`${cat.label} / Listings`}
        headlineLead={cat.label}
        headlineAccent="opportunities"
        subtitle={cat.intro}
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
      <div className="container-custom pt-4">
        <SubCategoryNav category={cat} />
      </div>
      <Suspense fallback={<div className="py-12 text-center text-slate-400">Loading listings...</div>}>
        <InvestListingsClient
          listings={listings}
          categories={categoryTabs}
          lockedCategory={slug}
          // Chips duplicate the SubCategoryNav tabs above — hide them whenever
          // the tabs render (categories with no subcategories keep the chips,
          // since DB-derived sub-types are then the only narrowing UI).
          hideSubCategoryChips={cat.subcategories.length > 0}
        />
      </Suspense>
    </>
  );
}
