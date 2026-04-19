import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { InvestmentListing } from "@/lib/types";
import {
  getInvestCategoryBySlug,
  getSubcategoryBySlug,
  getAllSubcategorySlugs,
  getCategoryDbFilter,
} from "@/lib/invest-categories";
import {
  absoluteUrl,
  breadcrumbJsonLd,
} from "@/lib/seo";
import {
  ADVERTISER_DISCLOSURE_SHORT,
  GENERAL_ADVICE_WARNING,
} from "@/lib/compliance";
import InvestListingCard from "@/components/InvestListingCard";
import { listingUrl } from "@/lib/listing-url";
import ScrollReveal from "@/components/ScrollReveal";
import SubCategoryNav from "@/components/SubCategoryNav";

export const revalidate = 3600;

// ── Static params for ISR ──
export function generateStaticParams() {
  return getAllSubcategorySlugs();
}

// ── Dynamic metadata ──
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; subcategory: string }>;
}): Promise<Metadata> {
  const { slug: category, subcategory } = await params;
  const cat = getInvestCategoryBySlug(category);
  if (!cat) return {};
  const sub = getSubcategoryBySlug(category, subcategory);
  if (!sub) return {};

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
  if (!sub) notFound();

  const supabase = await createClient();
  const filter = getCategoryDbFilter(cat);

  // Fetch listings filtered by category vertical + sub_category DB value
  const { data: listingsRaw } = await supabase
    .from("investment_listings")
    .select("*")
    .eq("status", "active")
    .in("vertical", filter.verticals)
    .eq("sub_category", sub.dbValue)
    .order("created_at", { ascending: false });

  const listings = (listingsRaw as InvestmentListing[]) || [];

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

      <div className="py-5 md:py-12">
        <div className="container-custom max-w-4xl">
          {/* Breadcrumb */}
          <nav className="text-xs md:text-sm text-slate-500 mb-3 md:mb-6">
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
            <p className="text-xs md:text-base text-slate-600 mb-2">{sub.intro}</p>
            <p className="text-[0.56rem] md:text-xs text-slate-400">
              {ADVERTISER_DISCLOSURE_SHORT}
            </p>
          </div>

          {/* General Advice Warning — collapsed on mobile, visible on desktop */}
          <div className="hidden md:block bg-slate-50 border border-slate-200 rounded-lg p-3 mb-3 text-[0.69rem] text-slate-500 leading-relaxed">
            <strong className="text-slate-600">General Advice Warning:</strong>{" "}
            {GENERAL_ADVICE_WARNING}
          </div>
          <div className="md:hidden mb-3">
            <details className="bg-slate-50 border border-slate-200 rounded-lg">
              <summary className="px-3 py-2 text-[0.62rem] text-slate-500 font-medium cursor-pointer flex items-center gap-1">
                <svg className="w-3 h-3 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                General advice only — not a personal recommendation.
              </summary>
              <p className="px-3 pb-2.5 text-[0.62rem] text-slate-500 leading-relaxed">
                {GENERAL_ADVICE_WARNING}
              </p>
            </details>
          </div>

          {/* Shared sub-category nav (consistent with /listings page) */}
          <SubCategoryNav category={cat} activeSubcategory={subcategory} />

          {/* Sub-category sibling navigation */}
          <div className="flex flex-wrap gap-1.5 mb-4 md:mb-6">
            <Link
              href={`/invest/${category}/listings`}
              className="px-3 py-1.5 text-xs font-semibold rounded-full bg-white border border-slate-200 text-slate-600 hover:border-slate-400 hover:text-slate-900 transition-colors"
            >
              All {cat.label}
            </Link>
            <span
              className={`px-3 py-1.5 text-xs font-semibold rounded-full ${cat.color.bg} ${cat.color.text} ${cat.color.border} border`}
            >
              {sub.label}
            </span>
            {siblingSubcategories.map((sibling) => (
              <Link
                key={sibling.slug}
                href={`/invest/${category}/listings/${sibling.slug}`}
                className="px-3 py-1.5 text-xs font-semibold rounded-full bg-white border border-slate-200 text-slate-600 hover:border-slate-400 hover:text-slate-900 transition-colors"
              >
                {sibling.label}
              </Link>
            ))}
          </div>

          {/* Listing count */}
          <h2 className="text-lg md:text-2xl font-bold mb-3 md:mb-4">
            {listings.length} {listings.length === 1 ? "Listing" : "Listings"} Available
          </h2>

          {/* Listing grid */}
          {listings.length > 0 ? (
            <ScrollReveal animation="scroll-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-6 md:mb-8">
                {listings.map((listing) => (
                  <InvestListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            </ScrollReveal>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center mb-6 md:mb-8">
              <p className="text-sm text-slate-600">
                No {sub.label.toLowerCase()} listings currently available. Check back soon or{" "}
                <Link href={`/invest/${category}/listings`} className="text-slate-900 font-semibold underline hover:text-slate-700">
                  browse all {cat.label.toLowerCase()} listings
                </Link>.
              </p>
            </div>
          )}

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
