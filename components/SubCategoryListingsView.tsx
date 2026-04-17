import Link from "next/link";
import type { InvestmentListing } from "@/lib/types";
import type { InvestSubcategory } from "@/lib/invest-categories";
import Icon from "@/components/Icon";
import ListingCard from "@/components/ListingCard";
import ListingsEmptyState from "@/components/ListingsEmptyState";

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
 * Server-rendered listings grid for /invest/{cat}/listings/{subcategory-slug}
 * when the trailing slug resolves to a known sub-category of the
 * parent category (e.g. /invest/alternatives/listings/coins).
 *
 * Includes a hero strip with the sub-category label, the filtered
 * listings grid, and — when there are zero matching listings — a
 * friendly empty state that links back to the parent category.
 * Never 404s.
 */
export default function SubCategoryListingsView({
  listings,
  subCategory,
  categorySlug,
  categoryLabel,
}: SubCategoryListingsViewProps) {
  return (
    <div>
      {/* Breadcrumb + hero */}
      <section className="bg-white border-b border-slate-100 py-8 md:py-10">
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
          <p className="text-sm md:text-base text-slate-600 leading-relaxed max-w-3xl">
            {subCategory.intro}
          </p>
        </div>
      </section>

      {/* Grid or empty state */}
      {listings.length === 0 ? (
        <ListingsEmptyState
          categoryLabel={categoryLabel}
          categorySlug={categorySlug}
          subCategoryLabel={subCategory.label}
        />
      ) : (
        <section className="py-8 md:py-12 bg-slate-50">
          <div className="container-custom">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
              {listings.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
            <div className="mt-10 text-center">
              <Link
                href={`/invest/${categorySlug}/listings`}
                className="inline-flex items-center gap-2 text-slate-700 font-semibold hover:text-slate-900"
              >
                ← Back to all {categoryLabel}
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
