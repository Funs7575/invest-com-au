import type { Metadata } from "next";
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
      <div className="container-custom pt-6">
        <SubCategoryNav category={cat} />
      </div>
      <Suspense fallback={<div className="py-12 text-center text-slate-400">Loading listings...</div>}>
        <InvestListingsClient
          listings={listings}
          categories={categoryTabs}
          lockedCategory={slug}
          pageTitle={`${cat.label} Investment Listings`}
          pageSubtitle={cat.intro}
        />
      </Suspense>
    </>
  );
}
