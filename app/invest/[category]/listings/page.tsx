import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { InvestmentListing } from "@/lib/types";
import {
  getInvestCategoryBySlug,
  getAllInvestCategorySlugs,
  getCategoryDbFilter,
  getAllInvestCategories,
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
import ScrollReveal from "@/components/ScrollReveal";

export const revalidate = 3600;

// ── Static params for ISR ──
export function generateStaticParams() {
  return getAllInvestCategorySlugs().map((category) => ({ category }));
}

// ── Dynamic metadata ──
export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const cat = getInvestCategoryBySlug(category);
  if (!cat) return {};

  const ogImageUrl = `/api/og?title=${encodeURIComponent(cat.h1)}&subtitle=${encodeURIComponent(cat.metaDescription.slice(0, 80))}&type=invest`;

  return {
    title: cat.title,
    description: cat.metaDescription,
    alternates: { canonical: `/invest/${category}/listings` },
    openGraph: {
      title: cat.title,
      description: cat.metaDescription,
      url: absoluteUrl(`/invest/${category}/listings`),
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: cat.h1 }],
    },
    twitter: { card: "summary_large_image" as const },
  };
}

export default async function InvestCategoryListingsPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const cat = getInvestCategoryBySlug(category);
  if (!cat) notFound();

  const supabase = await createClient();
  const filter = getCategoryDbFilter(cat);

  // Build query
  let query = supabase
    .from("investment_listings")
    .select("*")
    .eq("status", "active")
    .in("vertical", filter.verticals)
    .order("created_at", { ascending: false });

  if (filter.subCategories && filter.subCategories.length > 0) {
    query = query.in("sub_category", filter.subCategories);
  }

  const { data: listingsRaw } = await query;
  const listings = (listingsRaw as InvestmentListing[]) || [];

  // ── JSON-LD ──
  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Invest", url: absoluteUrl("/invest") },
    { name: cat.label },
  ]);

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: cat.h1,
    numberOfItems: listings.length,
    itemListElement: listings.slice(0, 20).map((l, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: l.title,
      url: absoluteUrl(`/invest/listing/${l.slug}`),
    })),
  };

  const faqJsonLd =
    cat.faqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: cat.faqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: faq.answer,
            },
          })),
        }
      : null;

  // Sibling categories for cross-links
  const allCategories = getAllInvestCategories().filter(
    (c) => c.slug !== category
  );

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
            <span className="text-slate-700">{cat.label}</span>
          </nav>

          {/* Hero */}
          <div className={`bg-gradient-to-br ${cat.color.gradient} border ${cat.color.border} rounded-2xl p-4 md:p-6 mb-3 md:mb-4`}>
            <h1 className="text-xl md:text-4xl font-extrabold mb-2 md:mb-3 text-slate-900">
              {cat.h1}
            </h1>
            <p className="text-xs md:text-base text-slate-600 mb-2">{cat.intro}</p>
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

          {/* Sub-category navigation pills */}
          {cat.subcategories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4 md:mb-6">
              <Link
                href={`/invest/${category}/listings`}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${cat.color.bg} ${cat.color.text} ${cat.color.border} border`}
              >
                All {cat.label}
              </Link>
              {cat.subcategories.map((sub) => (
                <Link
                  key={sub.slug}
                  href={`/invest/${category}/listings/${sub.slug}`}
                  className="px-3 py-1.5 text-xs font-semibold rounded-full bg-white border border-slate-200 text-slate-600 hover:border-slate-400 hover:text-slate-900 transition-colors"
                >
                  {sub.label}
                </Link>
              ))}
            </div>
          )}

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
                No listings currently available in this category. Check back soon or{" "}
                <Link href="/invest/listings" className="text-slate-900 font-semibold underline hover:text-slate-700">
                  browse all listings
                </Link>.
              </p>
            </div>
          )}

          {/* Browse All Listings link */}
          <div className="flex justify-center mb-6 md:mb-8">
            <Link
              href="/invest/listings"
              className="px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors"
            >
              Browse All Listings
            </Link>
          </div>

          {/* Editorial sections */}
          {cat.sections.length > 0 && (
            <div className="space-y-5 md:space-y-8 mb-6 md:mb-10">
              {cat.sections.map((section, i) => (
                <section key={i}>
                  <h2 className="text-xl font-bold mb-2">{section.heading}</h2>
                  <p className="text-slate-600 leading-relaxed">{section.body}</p>
                </section>
              ))}
            </div>
          )}

          {/* FAQ section */}
          {cat.faqs.length > 0 && (
            <div className="mb-8 md:mb-10">
              <h2 className="text-xl font-bold mb-4">Frequently Asked Questions</h2>
              <div className="space-y-4">
                {cat.faqs.map((faq, i) => (
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

          {/* Cross-links to sibling categories */}
          <div className="border-t border-slate-100 pt-5 md:pt-8">
            <h3 className="text-base md:text-lg font-bold mb-3 md:mb-4">
              More Investment Categories
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {allCategories.slice(0, 6).map((otherCat) => (
                <Link
                  key={otherCat.slug}
                  href={`/invest/${otherCat.slug}/listings`}
                  className="block p-3 border border-slate-200 rounded-lg hover:border-slate-700 hover:bg-slate-50/50 transition-colors"
                >
                  <span className="text-sm font-semibold text-slate-800">
                    {otherCat.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
