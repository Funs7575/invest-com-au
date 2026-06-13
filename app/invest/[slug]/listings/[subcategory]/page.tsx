import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import type { InvestmentListing, InvestListingVertical } from "@/lib/types";
import type { InvestmentListing as CardListing } from "@/components/ListingCard";
import {
  getInvestCategoryBySlug,
  getSubcategoryBySlug,
  getAllSubcategorySlugs,
  getCategoryDbFilter,
  getAllInvestCategories,
} from "@/lib/invest-categories";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  CURRENT_YEAR,
} from "@/lib/seo";
import {
  ADVERTISER_DISCLOSURE_SHORT,
  GENERAL_ADVICE_WARNING,
} from "@/lib/compliance";
import ListingsEmptyState from "@/components/ListingsEmptyState";
import ListingDetailView from "@/components/invest/ListingDetailView";
import InvestListingsClient from "@/components/InvestListingsClient";
import { fetchRelatedListings } from "@/lib/investment-listings-query";
import { listingUrl, rawVerticalVariants, categoryForListing } from "@/lib/listing-url";
import SubCategoryNav from "@/components/SubCategoryNav";

export const revalidate = 3600;

// ── Static params for ISR ──
export function generateStaticParams() {
  // getAllSubcategorySlugs() returns { category, subcategory }, but the
  // route segments are [slug]/[subcategory] — so the `slug` key was never
  // provided (a latent bug that contributed to a prod-only 500 on this
  // route). Map category → slug.
  return getAllSubcategorySlugs().map(({ category, subcategory }) => ({
    slug: category,
    subcategory,
  }));
}

// ── Dynamic metadata ──
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; subcategory: string }>;
}): Promise<Metadata> {
  const { slug: category, subcategory } = await params;
  const cat = getInvestCategoryBySlug(category);
  if (!cat) return { robots: { index: false } };
  const sub = getSubcategoryBySlug(category, subcategory);
  if (!sub) {
    // Not a subcategory — may be a single listing slug. Look it up by slug
    // (not vertical-scoped, see the page body) and verify it belongs to this
    // URL category; give it real metadata so the detail page is indexable,
    // otherwise noindex.
    const supabase = await createClient();
    const { data: rows } = await supabase
      .from("investment_listings")
      .select("*")
      .eq("slug", subcategory)
      .in("status", ["active", "sold"])
      .limit(5);
    const l = ((rows ?? []) as InvestmentListing[]).find(
      (r) => categoryForListing(r) === category,
    );
    if (l) {
      return {
        title: `${l.title} — ${cat.label} (${CURRENT_YEAR})`,
        description: (l.description ?? "").slice(0, 160) || cat.metaDescription,
        alternates: { canonical: `/invest/${category}/listings/${subcategory}` },
        openGraph: {
          title: `${l.title} — ${cat.label}`,
          description: (l.description ?? "").slice(0, 160) || cat.metaDescription,
          url: absoluteUrl(`/invest/${category}/listings/${subcategory}`),
        },
        twitter: { card: "summary_large_image" as const },
      };
    }
    return { robots: { index: false } };
  }

  const ogImageUrl = `/api/og?title=${encodeURIComponent(sub.h1)}&subtitle=${encodeURIComponent(sub.metaDescription.slice(0, 80))}&type=invest`;

  return {
    title: sub.title,
    description: sub.metaDescription,
    alternates: { canonical: `/invest/${category}/listings/${subcategory}` },
    openGraph: {
      title: sub.title,
      description: sub.metaDescription,
      url: absoluteUrl(`/invest/${category}/listings/${subcategory}`),
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: sub.h1 }],
    },
    twitter: { card: "summary_large_image" as const },
  };
}

export default async function InvestSubcategoryListingsPage({
  params,
}: {
  params: Promise<{ slug: string; subcategory: string }>;
}) {
  const { slug: category, subcategory } = await params;
  const cat = getInvestCategoryBySlug(category);
  if (!cat) notFound();
  const sub = getSubcategoryBySlug(category, subcategory);
  if (!sub) {
    // Not a subcategory — resolve a single listing by slug, else show a
    // friendly empty state. Never notFound()/crash: this is what makes
    // listing detail pages work for categories with no bespoke [slug]
    // route (funds, private-equity, royalties, venture-capital, …), which
    // previously 500'd in production.
    // Resolve a single listing by slug — NOT vertical-scoped. listingUrl's
    // category comes from categoryForListing, whose `?? "funds"` fallback
    // buckets unmapped verticals (e.g. listed securities) into /invest/funds,
    // so a vertical filter misses them. Look up by slug, then verify the
    // listing actually belongs to this URL category; else a friendly empty
    // state. (limit(5) guards the unlikely duplicate-slug case.)
    const supabaseForDetail = await createClient();
    const { data: rows } = await supabaseForDetail
      .from("investment_listings")
      .select("*")
      .eq("slug", subcategory)
      .in("status", ["active", "sold"])
      .limit(5);
    const listing = ((rows ?? []) as InvestmentListing[]).find(
      (r) => categoryForListing(r) === category,
    );
    if (listing) {
      const related = await fetchRelatedListings(
        listing.vertical as InvestListingVertical,
        subcategory,
        listing.sub_category,
        3,
      );
      return (
        <ListingDetailView
          listing={listing as unknown as CardListing}
          relatedListings={related as unknown as CardListing[]}
          categorySlug={category}
          categoryLabel={cat.label}
        />
      );
    }
    return <ListingsEmptyState categoryLabel={cat.label} categorySlug={category} />;
  }

  const supabase = await createClient();
  const filter = getCategoryDbFilter(cat);

  // Fetch listings filtered by category vertical + sub_category DB value
  const { data: listingsRaw } = await supabase
    .from("investment_listings")
    .select("*")
    .eq("status", "active")
    .in("vertical", filter.verticals.flatMap(rawVerticalVariants))
    .eq("sub_category", sub.dbValue)
    .order("created_at", { ascending: false });

  const listings = (listingsRaw as InvestmentListing[]) || [];
  const categoryTabs = getAllInvestCategories().map((c) => ({ slug: c.slug, label: c.label }));

  // Sibling subcategories (excluding current)
  const siblingSubcategories = cat.subcategories.filter(
    (s) => s.slug !== subcategory
  );

  // ── JSON-LD ──
  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Invest", url: absoluteUrl("/invest") },
    { name: cat.label, url: absoluteUrl(`/invest/${category}/listings`) },
    { name: sub.label },
  ]);

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: sub.h1,
    numberOfItems: listings.length,
    itemListElement: listings.slice(0, 20).map((l, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: l.title,
      url: absoluteUrl(listingUrl(l)),
    })),
  };

  const faqJsonLd =
    sub.faqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: sub.faqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: faq.answer,
            },
          })),
        }
      : null;

  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}

      {/* ── Hero band — breadcrumb, per-commodity hero, compliance, sub-type tabs.
          Full container width so the tab row lines up with the toolbar the
          listings client renders below. ── */}
      <div className="pt-5 md:pt-10">
        <div className="container-custom">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="text-xs md:text-sm text-slate-500 mb-3 md:mb-6">
            <Link href="/" className="hover:text-slate-900">
              Home
            </Link>
            <span className="mx-2">/</span>
            <Link href="/invest" className="hover:text-slate-900">
              Invest
            </Link>
            <span className="mx-2">/</span>
            <Link href={`/invest/${category}/listings`} className="hover:text-slate-900">
              {cat.label}
            </Link>
            <span className="mx-2">/</span>
            <span className="text-slate-700">{sub.label}</span>
          </nav>

          {/* Hero */}
          <div className={`bg-gradient-to-br ${cat.color.gradient} border ${cat.color.border} rounded-2xl p-4 md:p-6 mb-3 md:mb-4`}>
            <h1 className="text-xl md:text-4xl font-extrabold mb-2 md:mb-3 text-slate-900">
              {sub.h1}
            </h1>
            <p className="text-xs md:text-base text-slate-600 mb-2 max-w-3xl">{sub.intro}</p>
            <p className="text-[0.56rem] md:text-xs text-slate-500">
              {ADVERTISER_DISCLOSURE_SHORT}
            </p>
          </div>

          {/* General Advice Warning — one-line summary always visible, full
              text expands on demand (all viewports). The global footer keeps
              the full warning on every page regardless. */}
          <details className="bg-slate-50 border border-slate-200 rounded-lg mb-3">
            <summary className="px-3 py-2 text-[0.62rem] md:text-xs text-slate-500 font-medium cursor-pointer flex items-center gap-1.5">
              <svg className="w-3 h-3 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              General advice only — not a personal recommendation.
            </summary>
            <p className="px-3 pb-2.5 text-[0.62rem] md:text-xs text-slate-500 leading-relaxed">
              {GENERAL_ADVICE_WARNING}
            </p>
          </details>

          {/* Sub-type tabs — the ONE sub-category selector on this page. The
              listings client below hides its in-results chips, which would
              otherwise duplicate these tabs with near-identical pills. */}
          <SubCategoryNav category={cat} activeSubcategory={subcategory} />
        </div>
      </div>

      {/* ── Interactive listings — same search / sort / filter toolbar as the
          parent /listings page, scoped to listings pre-filtered server-side
          to this sub-type. No pageTitle: the hero above owns the h1. ── */}
      <Suspense fallback={<div className="py-12 text-center text-slate-500">Loading listings...</div>}>
        <InvestListingsClient
          listings={listings}
          categories={categoryTabs}
          lockedCategory={category}
          hideSubCategoryChips
          // Server query above already scoped by vertical + sub_category —
          // categoryForListing would re-bucket fund-family sub-types (e.g.
          // fund + infrastructure → "infrastructure") away from this page's
          // lock and silently drop them.
          skipCategoryFilter
        />
      </Suspense>

      <div className="pb-8 md:pb-12">
        <div className="container-custom max-w-4xl">
          {/* FAQ section */}
          {sub.faqs.length > 0 && (
            <div className="mb-8 md:mb-10">
              <h2 className="text-xl font-bold mb-4">Frequently Asked Questions</h2>
              <div className="space-y-4">
                {sub.faqs.map((faq, i) => (
                  <details key={i} className="border border-slate-200 rounded-lg">
                    <summary className="px-4 py-3 font-semibold text-sm cursor-pointer hover:bg-slate-50 transition-colors">
                      {faq.question}
                    </summary>
                    <p className="px-4 pb-4 text-sm text-slate-600 leading-relaxed">
                      {faq.answer}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          )}

          {/* Back to parent + Browse All links */}
          <div className="flex flex-wrap gap-3 mb-6 md:mb-8">
            <Link
              href={`/invest/${category}/listings`}
              className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-200 text-slate-700 hover:border-slate-400 hover:text-slate-900 transition-colors"
            >
              Browse All {cat.label}
            </Link>
            <Link
              href="/invest/listings"
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors"
            >
              Browse All Listings
            </Link>
          </div>

          {/* Sibling subcategory cross-links */}
          {siblingSubcategories.length > 0 && (
            <div className="border-t border-slate-100 pt-5 md:pt-8">
              <h3 className="text-base md:text-lg font-bold mb-3 md:mb-4">
                More in {cat.label}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {siblingSubcategories.map((sibling) => (
                  <Link
                    key={sibling.slug}
                    href={`/invest/${category}/listings/${sibling.slug}`}
                    className="block p-3 border border-slate-200 rounded-lg hover:border-slate-700 hover:bg-slate-50/50 transition-colors"
                  >
                    <span className="text-sm font-semibold text-slate-800">
                      {sibling.label}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
