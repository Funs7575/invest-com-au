import Link from "next/link";
import { Suspense } from "react";
import type { InvestmentListing } from "@/lib/types";
import type { InvestSubcategory } from "@/lib/invest-categories";
import { getAllInvestCategories, getInvestCategoryBySlug } from "@/lib/invest-categories";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import {
  ADVERTISER_DISCLOSURE_SHORT,
  GENERAL_ADVICE_WARNING,
} from "@/lib/compliance";
import Icon from "@/components/Icon";
import ListingsEmptyState from "@/components/ListingsEmptyState";
import InvestListingsClient from "@/components/InvestListingsClient";
import SubCategoryNav from "@/components/SubCategoryNav";

interface SubCategoryListingsViewProps {
  /** Listings that matched the sub-category filter. */
  listings: InvestmentListing[];
  /** The sub-category record from lib/invest-categories. */
  subCategory: InvestSubcategory;
  /** Parent category URL slug (e.g. "alternatives"). */
  categorySlug: string;
  /** Parent category display label (e.g. "Alternative Investments"). */
  categoryLabel: string;
}

/**
 * Sub-category listings page for /invest/{cat}/listings/{subcategory-slug}
 * when the trailing slug resolves to a known sub-category of the parent
 * category (e.g. /invest/mining/listings/gold). Used by every bespoke
 * category [slug] route — these shadow the generic
 * app/invest/[slug]/listings/[subcategory] route, so keep the two in step.
 *
 * Renders the SEO hero (h1/intro/FAQ + JSON-LD), the SubCategoryNav tab
 * bar (the ONE sub-type selector), and the same interactive
 * search/sort/filter listings experience as the parent /listings page,
 * scoped to listings pre-filtered server-side to this sub-type.
 * Never 404s.
 */
export default function SubCategoryListingsView({
  listings,
  subCategory,
  categorySlug,
  categoryLabel,
}: SubCategoryListingsViewProps) {
  const cat = getInvestCategoryBySlug(categorySlug);
  const categoryTabs = getAllInvestCategories().map((c) => ({ slug: c.slug, label: c.label }));

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Invest", url: absoluteUrl("/invest") },
    { name: categoryLabel, url: absoluteUrl(`/invest/${categorySlug}/listings`) },
    { name: subCategory.label },
  ]);

  const faqJsonLd =
    subCategory.faqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: subCategory.faqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: { "@type": "Answer", text: faq.answer },
          })),
        }
      : null;

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}

      {/* Breadcrumb + hero + compliance + sub-type tabs */}
      <section className="bg-white border-b border-slate-100 pt-8 md:pt-10 pb-0">
        <div className="container-custom">
          <nav
            className="flex items-center gap-1.5 text-xs text-slate-500 mb-4 flex-wrap"
            aria-label="Breadcrumb"
          >
            <Link href="/" className="hover:text-slate-900 transition-colors">
              Home
            </Link>
            <Icon name="chevron-right" size={12} className="text-slate-300" aria-hidden="true" />
            <Link href="/invest" className="hover:text-slate-900 transition-colors">
              Invest
            </Link>
            <Icon name="chevron-right" size={12} className="text-slate-300" aria-hidden="true" />
            <Link
              href={`/invest/${categorySlug}/listings`}
              className="hover:text-slate-900 transition-colors"
            >
              {categoryLabel}
            </Link>
            <Icon name="chevron-right" size={12} className="text-slate-300" aria-hidden="true" />
            <span className="text-slate-900 font-medium">{subCategory.label}</span>
          </nav>

          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">
            {subCategory.h1}
          </h1>
          <p className="text-sm md:text-base text-slate-600 leading-relaxed max-w-3xl mb-2">
            {subCategory.intro}
          </p>
          <p className="text-[0.62rem] md:text-xs text-slate-500 mb-3">
            {ADVERTISER_DISCLOSURE_SHORT}
          </p>

          {/* General Advice Warning — one-line summary always visible, full
              text expands on demand. The global footer keeps the full warning
              on every page regardless. */}
          <details className="bg-slate-50 border border-slate-200 rounded-lg mb-4">
            <summary className="px-3 py-2 text-[0.62rem] md:text-xs text-slate-500 font-medium cursor-pointer flex items-center gap-1.5">
              <svg className="w-3 h-3 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              General advice only — not a personal recommendation.
            </summary>
            <p className="px-3 pb-2.5 text-[0.62rem] md:text-xs text-slate-500 leading-relaxed">
              {GENERAL_ADVICE_WARNING}
            </p>
          </details>

          {/* Sub-type tabs — the ONE sub-type selector on this page; the
              listings client below hides its in-results chips. */}
          {cat && <SubCategoryNav category={cat} activeSubcategory={subCategory.slug} />}
        </div>
      </section>

      {/* Interactive listings or empty state */}
      {listings.length === 0 ? (
        <ListingsEmptyState
          categoryLabel={categoryLabel}
          categorySlug={categorySlug}
          subCategoryLabel={subCategory.label}
        />
      ) : (
        <Suspense fallback={<div className="py-12 text-center text-slate-400">Loading listings...</div>}>
          {/* Same toolbar as the parent /listings page, scoped to this
              sub-type. skipCategoryFilter: the server query already scoped
              by vertical + sub_category — categoryForListing would re-bucket
              fund-family sub-types / listed_security kinds elsewhere and
              silently drop them. No pageTitle: the hero above owns the h1. */}
          <InvestListingsClient
            listings={listings}
            categories={categoryTabs}
            lockedCategory={categorySlug}
            hideSubCategoryChips
            skipCategoryFilter
          />
        </Suspense>
      )}

      {/* FAQ — parity with the generic subcategory route */}
      {subCategory.faqs.length > 0 && (
        <section className="py-8 md:py-10 bg-white border-t border-slate-100">
          <div className="container-custom max-w-4xl">
            <h2 className="text-xl font-bold mb-4">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {subCategory.faqs.map((faq, i) => (
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
        </section>
      )}

      <section className="py-8 bg-white border-t border-slate-100">
        <div className="container-custom text-center">
          <Link
            href={`/invest/${categorySlug}/listings`}
            className="inline-flex items-center gap-2 text-slate-700 font-semibold hover:text-slate-900"
          >
            ← Back to all {categoryLabel}
          </Link>
        </div>
      </section>
    </div>
  );
}
